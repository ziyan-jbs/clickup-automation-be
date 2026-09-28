import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { DateTime } from "luxon";
import { IsNull, Repository } from "typeorm";

import { DAY_KEYS, dayBoundsMs, entryStartMs, localDay } from "@/common/date-time/date-time.helper";
import { TokenEncryptionService } from "@/common/security/token-encryption.service";
import {
  AutomationRule,
  AutomationRuleRun,
  ClickUpTask,
  UserPreference,
} from "@/entities";
import { ClickUpApiClient } from "@/providers/clickup/clickup-api.client";
import { CreateRuleDto } from "@/routes/automation-rule/dto/create-rule.dto";
import {
  BackfillRangeDto,
  DraftPreviewDto,
  ListRulesQuery,
} from "@/routes/automation-rule/dto/rule-queries.dto";
import { UpdateRuleDto } from "@/routes/automation-rule/dto/update-rule.dto";
import {
  AutomationRuleStatus,
  AutomationRunStatus,
  AutomationRunTrigger,
  ExistingTimeBehavior,
} from "@/types/automation.types";

interface BackfillClaims {
  purpose: string;
  sub: string;
  ruleId: string;
  dates: string[];
}
@Injectable()
export class AutomationRuleService {
  constructor(
    @InjectRepository(AutomationRule) private readonly ruleRepository: Repository<AutomationRule>,
    @InjectRepository(AutomationRuleRun) private readonly runRepository: Repository<AutomationRuleRun>,
    @InjectRepository(ClickUpTask) private readonly taskRepository: Repository<ClickUpTask>,
    @InjectRepository(UserPreference) private readonly preferenceRepository: Repository<UserPreference>,
    private readonly clickUpApiClient: ClickUpApiClient,
    private readonly encryptionService: TokenEncryptionService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async list(userId: string, query: ListRulesQuery) {
    const builder = this.ruleRepository
      .createQueryBuilder("rule")
      .innerJoinAndSelect("rule.task", "task")
      .innerJoinAndSelect("task.workspace", "workspace")
      .where("rule.userId = :userId", { userId });
    if (query.workspaceId) builder.andWhere("task.workspaceId = :workspaceId", { workspaceId: query.workspaceId });
    if (query.status) builder.andWhere("rule.status = :status", { status: query.status });
    const [rules, total] = await builder.orderBy("rule.createdAt", "DESC").skip((query.page - 1) * query.pageSize).take(query.pageSize).getManyAndCount();
    return { items: rules.map((rule) => this.serializeRule(rule)), meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async get(userId: string, id: string) {
    return this.serializeRule(await this.getOwnedRule(userId, id));
  }

  async create(userId: string, dto: CreateRuleDto) {
    this.validateDateRange(dto.startDate, dto.endDate);
    const task = await this.getOwnedTask(userId, dto.taskId);
    const candidate = this.ruleRepository.create({
      ...dto,
      userId,
      endDate: dto.endDate || null,
      timeEntryDescription: dto.timeEntryDescription || null,
      auditNote: dto.auditNote || null,
      status: AutomationRuleStatus.Active,
      lastRunAt: null,
      nextRunAt: null,
    });
    candidate.task = task;
    await this.assertNoOverlap(userId, task.workspaceId, candidate);
    return this.serializeRule(await this.ruleRepository.save(candidate));
  }

  async update(userId: string, id: string, dto: UpdateRuleDto) {
    const rule = await this.getOwnedRule(userId, id);
    const task = dto.taskId ? await this.getOwnedTask(userId, dto.taskId) : rule.task;
    Object.assign(rule, dto);
    rule.task = task;
    rule.endDate = dto.endDate === undefined ? rule.endDate : dto.endDate || null;
    this.validateDateRange(rule.startDate, rule.endDate);
    if (rule.status === AutomationRuleStatus.Active) await this.assertNoOverlap(userId, task.workspaceId, rule, rule.id);
    return this.serializeRule(await this.ruleRepository.save(rule));
  }

  async setStatus(userId: string, id: string, status: AutomationRuleStatus) {
    const rule = await this.getOwnedRule(userId, id);
    if (status === AutomationRuleStatus.Active) await this.assertNoOverlap(userId, rule.task.workspaceId, rule, rule.id);
    rule.status = status;
    return this.serializeRule(await this.ruleRepository.save(rule));
  }

  async remove(userId: string, id: string): Promise<void> {
    const rule = await this.getOwnedRule(userId, id);
    rule.status = AutomationRuleStatus.Paused;
    await this.ruleRepository.save(rule);
    await this.ruleRepository.softRemove(rule);
  }

  async previewDraft(userId: string, dto: DraftPreviewDto) {
    const task = await this.getOwnedTask(userId, dto.taskId);
    const preference = await this.getPreference(userId);
    this.assertNotFuture(dto.targetDate, preference.timezone);
    const context = await this.getTaskExecutionContext(userId, task, preference);
    const existingMinutes = await this.getExistingMinutes(context.token, task.workspace.clickupWorkspaceId, dto.targetDate, preference.timezone);
    return { taskId: task.id, clickupTaskId: task.clickupTaskId, targetDate: dto.targetDate, existingMinutes, ...this.decide(dto.minutesPerDay, existingMinutes, dto.existingTimeBehavior) };
  }

  async preview(userId: string, ruleId: string, targetDate: string) {
    const rule = await this.getOwnedRule(userId, ruleId, true);
    return this.previewOwnedRule(userId, rule, targetDate);
  }

  async execute(userId: string, ruleId: string, targetDate: string, trigger = AutomationRunTrigger.Manual) {
    const rule = await this.getOwnedRule(userId, ruleId, true);
    this.assertEligible(rule, targetDate);
    const preference = await this.getPreference(userId);
    this.assertNotFuture(targetDate, preference.timezone);
    let run = await this.runRepository.findOneBy({ ruleId, userId, taskId: rule.taskId, targetDate });
    if (run) {
      const staleProcessing = run.status === AutomationRunStatus.Processing && run.updatedAt.getTime() < Date.now() - 10 * 60_000;
      return staleProcessing ? this.processRun(rule, run, false) : this.serializeRun(run);
    }
    try {
      run = await this.runRepository.save(this.runRepository.create({ ruleId, userId, taskId: rule.taskId, targetDate, expectedMinutes: rule.minutesPerDay, existingMinutes: null, addedMinutes: null, clickupTimeEntryId: null, status: AutomationRunStatus.Processing, trigger, errorMessage: null, metadata: {}, completedAt: null }));
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        const duplicate = await this.runRepository.findOneByOrFail({ ruleId, userId, taskId: rule.taskId, targetDate });
        return this.serializeRun(duplicate);
      }
      throw error;
    }
    return this.processRun(rule, run, false);
  }

  async listRuns(userId: string, ruleId: string) {
    await this.getOwnedRule(userId, ruleId);
    const runs = await this.runRepository.find({ where: { userId, ruleId }, order: { targetDate: "DESC", createdAt: "DESC" } });
    return { items: runs.map((run) => this.serializeRun(run)), meta: { total: runs.length } };
  }

  async approve(userId: string, runId: string) {
    const run = await this.getOwnedRun(userId, runId);
    const claimed = await this.runRepository.update({ id: run.id, status: AutomationRunStatus.AwaitingApproval }, { status: AutomationRunStatus.Processing });
    if (!claimed.affected) throw new ConflictException("Run is not awaiting approval");
    const rule = await this.getOwnedRule(userId, run.ruleId, true);
    run.status = AutomationRunStatus.Processing;
    return this.processRun(rule, run, true);
  }

  async reject(userId: string, runId: string) {
    const run = await this.getOwnedRun(userId, runId);
    const claimed = await this.runRepository.update({ id: run.id, status: AutomationRunStatus.AwaitingApproval }, { status: AutomationRunStatus.Skipped, addedMinutes: 0, completedAt: new Date(), metadata: { ...run.metadata, reason: "rejected_by_user" } });
    if (!claimed.affected) throw new ConflictException("Run is not awaiting approval");
    return this.serializeRun(await this.runRepository.findOneByOrFail({ id: run.id }));
  }

  async retry(userId: string, runId: string) {
    const run = await this.getOwnedRun(userId, runId);
    const claimed = await this.runRepository.update({ id: run.id, status: AutomationRunStatus.Failed }, { status: AutomationRunStatus.Processing, errorMessage: null, completedAt: null });
    if (!claimed.affected) throw new ConflictException("Only failed runs can be retried");
    const rule = await this.getOwnedRule(userId, run.ruleId, true);
    run.status = AutomationRunStatus.Processing;
    run.errorMessage = null;
    return this.processRun(rule, run, rule.existingTimeBehavior !== ExistingTimeBehavior.Approval);
  }

  async previewBackfill(userId: string, ruleId: string, dto: BackfillRangeDto) {
    const rule = await this.getOwnedRule(userId, ruleId, true);
    const start = localDay(dto.startDate, "UTC");
    const end = localDay(dto.endDate, "UTC");
    const dayCount = Math.floor(end.diff(start, "days").days) + 1;
    if (dayCount < 1 || dayCount > 31) throw new BadRequestException("Backfill range must contain 1 to 31 days");
    const dates = Array.from({ length: dayCount }, (_, index) => start.plus({ days: index }).toISODate() as string).filter((date) => this.isEligible(rule, date));
    const items = [];
    for (const date of dates) items.push(await this.previewOwnedRule(userId, rule, date));
    const previewId = await this.jwtService.signAsync(
      { purpose: "backfill", sub: userId, ruleId, dates },
      { secret: this.jwtSecret, expiresIn: 600, issuer: this.issuer, audience: this.audience },
    );
    return { previewId, expiresIn: 600, items };
  }

  async executeBackfill(userId: string, ruleId: string, previewId: string) {
    let claims: BackfillClaims;
    try {
      claims = await this.jwtService.verifyAsync<BackfillClaims>(previewId, { secret: this.jwtSecret, issuer: this.issuer, audience: this.audience });
    } catch {
      throw new UnauthorizedException("Invalid or expired backfill preview");
    }
    if (claims.purpose !== "backfill" || claims.sub !== userId || claims.ruleId !== ruleId) throw new UnauthorizedException("Backfill preview does not match this rule");
    const items = [];
    for (const date of claims.dates) items.push(await this.execute(userId, ruleId, date, AutomationRunTrigger.Backfill));
    return { items, meta: { total: items.length } };
  }

  async executeDueRules(): Promise<{ processed: number }> {
    const rules = await this.ruleRepository.find({ where: { status: AutomationRuleStatus.Active, deletedAt: IsNull() }, relations: { task: { workspace: { connection: true } }, user: { preference: true } } });
    let processed = 0;
    for (const rule of rules) {
      const preference = rule.user.preference;
      if (!preference) continue;
      const now = DateTime.now().setZone(preference.timezone);
      if (!now.isValid || now.toFormat("HH:mm") < preference.runTime) continue;
      const targetDate = now.minus({ days: 1 }).toISODate();
      if (!targetDate || !this.isEligible(rule, targetDate)) continue;
      await this.execute(rule.userId, rule.id, targetDate, AutomationRunTrigger.Scheduled);
      processed += 1;
    }
    return { processed };
  }

  private async processRun(rule: AutomationRule, run: AutomationRuleRun, approved: boolean) {
    try {
      const preference = await this.getPreference(rule.userId);
      const context = await this.getTaskExecutionContext(rule.userId, rule.task, preference);
      const existingMinutes = await this.getExistingMinutes(context.token, rule.task.workspace.clickupWorkspaceId, run.targetDate, preference.timezone);
      const decision = this.decide(rule.minutesPerDay, existingMinutes, rule.existingTimeBehavior);
      run.existingMinutes = existingMinutes;
      run.addedMinutes = decision.minutesToAdd;
      run.metadata = { ...run.metadata, action: decision.action };

      if (rule.existingTimeBehavior === ExistingTimeBehavior.Approval && decision.minutesToAdd > 0 && !approved) {
        run.status = AutomationRunStatus.AwaitingApproval;
        return this.serializeRun(await this.runRepository.save(run));
      }
      if (decision.minutesToAdd === 0) {
        run.status = AutomationRunStatus.Skipped;
        run.completedAt = new Date();
        return this.serializeRun(await this.runRepository.save(run));
      }

      run.clickupTimeEntryId = await this.clickUpApiClient.createTimeEntry(context.token, rule.task.workspace.clickupWorkspaceId, {
        taskId: rule.task.clickupTaskId,
        startMs: entryStartMs(run.targetDate, preference.defaultEntryStartTime, preference.timezone),
        durationMinutes: decision.minutesToAdd,
        description: rule.timeEntryDescription,
      });
      run.status = AutomationRunStatus.Added;
      run.completedAt = new Date();
      rule.lastRunAt = run.completedAt;
      await this.ruleRepository.save(rule);
      return this.serializeRun(await this.runRepository.save(run));
    } catch (error) {
      run.status = AutomationRunStatus.Failed;
      run.errorMessage = error instanceof Error ? error.message.slice(0, 2_000) : "Unknown execution error";
      run.completedAt = new Date();
      return this.serializeRun(await this.runRepository.save(run));
    }
  }

  private decide(targetMinutes: number, existingMinutes: number, behavior: ExistingTimeBehavior) {
    const minutesToAdd = behavior === ExistingTimeBehavior.Skip
      ? existingMinutes === 0 ? targetMinutes : 0
      : Math.max(0, targetMinutes - existingMinutes);
    return { targetMinutes, minutesToAdd, action: minutesToAdd > 0 ? behavior === ExistingTimeBehavior.Approval ? "await_approval" : "add" : "skip" };
  }

  private async previewOwnedRule(userId: string, rule: AutomationRule, targetDate: string) {
    this.assertEligible(rule, targetDate);
    const preference = await this.getPreference(userId);
    this.assertNotFuture(targetDate, preference.timezone);
    const context = await this.getTaskExecutionContext(userId, rule.task, preference);
    const existingMinutes = await this.getExistingMinutes(context.token, rule.task.workspace.clickupWorkspaceId, targetDate, preference.timezone);
    return { ruleId: rule.id, taskId: rule.taskId, clickupTaskId: rule.task.clickupTaskId, targetDate, existingMinutes, ...this.decide(rule.minutesPerDay, existingMinutes, rule.existingTimeBehavior) };
  }

  private async getExistingMinutes(token: string, workspaceId: string, date: string, timezone: string): Promise<number> {
    const bounds = dayBoundsMs(date, timezone);
    const entries = await this.clickUpApiClient.getTimeEntries(token, workspaceId, bounds.startMs, bounds.endMs);
    if (entries.some((entry) => Number(entry.duration) < 0)) throw new ConflictException("A running ClickUp timer must be stopped before automation can continue");
    return entries.reduce((sum, entry) => sum + Math.max(0, Math.round(Number(entry.duration) / 60_000)), 0);
  }

  private async getTaskExecutionContext(userId: string, task: ClickUpTask, preference: UserPreference) {
    const connection = task.workspace?.connection;
    if (!connection || connection.userId !== userId || !connection.isActive || !connection.encryptedAccessToken || !task.workspace.isAuthorized) {
      throw new NotFoundException("Connected workspace is unavailable");
    }
    return { preference, token: this.encryptionService.decrypt(connection.encryptedAccessToken) };
  }

  private async getOwnedTask(userId: string, taskId: string): Promise<ClickUpTask> {
    const task = await this.taskRepository.findOne({ where: { id: taskId }, relations: { workspace: { connection: true } } });
    if (!task || task.workspace.connection.userId !== userId || !task.isAvailable) throw new NotFoundException("Task not found");
    return task;
  }

  private async getOwnedRule(userId: string, id: string, executionRelations = false): Promise<AutomationRule> {
    const rule = await this.ruleRepository.findOne({ where: { id, userId }, relations: { task: { workspace: { connection: executionRelations } } } });
    if (!rule) throw new NotFoundException("Automation rule not found");
    return rule;
  }

  private async getOwnedRun(userId: string, id: string): Promise<AutomationRuleRun> {
    const run = await this.runRepository.findOneBy({ id, userId });
    if (!run) throw new NotFoundException("Automation run not found");
    return run;
  }

  private async getPreference(userId: string): Promise<UserPreference> {
    const preference = await this.preferenceRepository.findOneBy({ userId });
    if (!preference) throw new NotFoundException("User settings not found");
    return preference;
  }

  private async assertNoOverlap(userId: string, workspaceId: string, candidate: AutomationRule, excludeId?: string): Promise<void> {
    const rules = await this.ruleRepository.find({ where: { userId, status: AutomationRuleStatus.Active }, relations: { task: true } });
    const conflict = rules.find((rule) => rule.id !== excludeId && rule.task.workspaceId === workspaceId && this.dateRangesOverlap(rule, candidate) && rule.daysOfWeek.some((day) => candidate.daysOfWeek.includes(day)));
    if (conflict) throw new ConflictException(`Rule overlaps active rule ${conflict.id}`);
  }

  private dateRangesOverlap(a: AutomationRule, b: AutomationRule): boolean {
    const aEnd = a.endDate || "9999-12-31";
    const bEnd = b.endDate || "9999-12-31";
    return a.startDate <= bEnd && b.startDate <= aEnd;
  }

  private validateDateRange(startDate: string, endDate?: string | null): void {
    if (endDate && endDate < startDate) throw new BadRequestException("endDate must be on or after startDate");
  }

  private assertEligible(rule: AutomationRule, targetDate: string): void {
    if (!this.isEligible(rule, targetDate)) throw new BadRequestException("Rule is not eligible for the selected date");
  }

  private assertNotFuture(targetDate: string, timezone: string): void {
    if (localDay(targetDate, timezone) > DateTime.now().setZone(timezone).startOf("day")) {
      throw new BadRequestException("Future dates cannot be executed");
    }
  }

  private isEligible(rule: AutomationRule, targetDate: string): boolean {
    if (targetDate < rule.startDate || (rule.endDate && targetDate > rule.endDate)) return false;
    const date = DateTime.fromISO(targetDate, { zone: "UTC" });
    return date.isValid && rule.daysOfWeek.includes(DAY_KEYS[date.weekday - 1]);
  }

  private serializeRule(rule: AutomationRule) {
    return { id: rule.id, name: rule.name, taskId: rule.taskId, task: rule.task ? { id: rule.task.id, clickupTaskId: rule.task.clickupTaskId, name: rule.task.name, workspaceId: rule.task.workspaceId } : undefined, minutesPerDay: rule.minutesPerDay, daysOfWeek: rule.daysOfWeek, startDate: rule.startDate, endDate: rule.endDate, skipWeekends: rule.skipWeekends, skipPublicHolidays: rule.skipPublicHolidays, existingTimeBehavior: rule.existingTimeBehavior, status: rule.status, timeEntryDescription: rule.timeEntryDescription, auditNote: rule.auditNote, lastRunAt: rule.lastRunAt, nextRunAt: rule.nextRunAt, createdAt: rule.createdAt, updatedAt: rule.updatedAt };
  }

  private serializeRun(run: AutomationRuleRun) {
    return { id: run.id, ruleId: run.ruleId, taskId: run.taskId, targetDate: run.targetDate, expectedMinutes: run.expectedMinutes, existingMinutes: run.existingMinutes, addedMinutes: run.addedMinutes, clickupTimeEntryId: run.clickupTimeEntryId, status: run.status, trigger: run.trigger, errorMessage: run.errorMessage, metadata: run.metadata, completedAt: run.completedAt, createdAt: run.createdAt, updatedAt: run.updatedAt };
  }

  private get jwtSecret(): string { return this.configService.get<string>("security.jwtAccessSecret") || ""; }
  private get issuer(): string { return this.configService.get<string>("security.jwtIssuer") || "clickup-automation-api"; }
  private get audience(): string { return this.configService.get<string>("security.jwtAudience") || "clickup-automation-web"; }
}
