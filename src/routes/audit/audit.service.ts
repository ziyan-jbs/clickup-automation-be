import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, Repository, SelectQueryBuilder } from "typeorm";

import { AutomationRuleRun } from "@/entities";
import { ListAuditQuery } from "@/routes/audit/dto/list-audit.query";
import { AutomationRunStatus } from "@/types/automation.types";

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AutomationRuleRun) private readonly runRepository: Repository<AutomationRuleRun>) {}

  async list(userId: string, query: ListAuditQuery) {
    const builder = this.applyFilters(this.baseQuery(userId), query);
    const [runs, total] = await builder.orderBy("run.createdAt", "DESC").skip((query.page - 1) * query.pageSize).take(query.pageSize).getManyAndCount();
    return { items: runs.map((run) => this.serialize(run)), meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async get(userId: string, id: string) {
    const run = await this.baseQuery(userId).andWhere("run.id = :id", { id }).getOne();
    if (!run) throw new NotFoundException("Audit run not found");
    return this.serialize(run);
  }

  async summary(userId: string, query: ListAuditQuery) {
    const runs = await this.applyFilters(this.baseQuery(userId), query).getMany();
    const completed = runs.filter((run) => [AutomationRunStatus.Added, AutomationRunStatus.Skipped, AutomationRunStatus.Failed].includes(run.status));
    const successful = completed.filter((run) => run.status !== AutomationRunStatus.Failed).length;
    return {
      totalAddedMinutes: runs.reduce((sum, run) => sum + (run.addedMinutes || 0), 0),
      efficiencyPercent: completed.length ? Number(((successful / completed.length) * 100).toFixed(1)) : 100,
      failedCount: runs.filter((run) => run.status === AutomationRunStatus.Failed).length,
      awaitingApprovalCount: runs.filter((run) => run.status === AutomationRunStatus.AwaitingApproval).length,
      lastAuditAt: runs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]?.createdAt || null,
    };
  }

  async exportCsv(userId: string, query: ListAuditQuery): Promise<string> {
    const runs = await this.applyFilters(this.baseQuery(userId), query).orderBy("run.createdAt", "DESC").take(10_000).getMany();
    const rows = [["Run ID", "Target Date", "Task ID", "Task Name", "Rule", "Expected Minutes", "Existing Minutes", "Added Minutes", "Status", "Trigger", "ClickUp Entry ID", "Error"]];
    for (const run of runs) rows.push([run.id, run.targetDate, run.task.clickupTaskId, run.task.name, run.rule.name, String(run.expectedMinutes), String(run.existingMinutes ?? ""), String(run.addedMinutes ?? ""), run.status, run.trigger, run.clickupTimeEntryId || "", run.errorMessage || ""]);
    return rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n");
  }

  private baseQuery(userId: string) {
    return this.runRepository.createQueryBuilder("run").withDeleted().innerJoinAndSelect("run.rule", "rule").innerJoinAndSelect("run.task", "task").innerJoinAndSelect("task.workspace", "workspace").where("run.userId = :userId", { userId });
  }

  private applyFilters(builder: SelectQueryBuilder<AutomationRuleRun>, query: ListAuditQuery) {
    if (query.workspaceId) builder.andWhere("task.workspaceId = :workspaceId", { workspaceId: query.workspaceId });
    if (query.status) builder.andWhere("run.status = :status", { status: query.status });
    if (query.dateFrom) builder.andWhere("run.targetDate >= :dateFrom", { dateFrom: query.dateFrom });
    if (query.dateTo) builder.andWhere("run.targetDate <= :dateTo", { dateTo: query.dateTo });
    if (query.search) builder.andWhere(new Brackets((where) => where.where("task.name ILIKE :search", { search: `%${query.search}%` }).orWhere("task.clickupTaskId ILIKE :search", { search: `%${query.search}%` }).orWhere("rule.name ILIKE :search", { search: `%${query.search}%` })));
    return builder;
  }

  private serialize(run: AutomationRuleRun) {
    const action = run.status === AutomationRunStatus.Added ? `Added ${run.addedMinutes || 0} minutes` : run.status === AutomationRunStatus.Skipped ? String(run.metadata.reason || "No change needed") : run.status === AutomationRunStatus.AwaitingApproval ? "Waiting for approval" : run.status === AutomationRunStatus.Failed ? run.errorMessage || "Execution failed" : "Processing";
    return { id: run.id, occurredAt: run.createdAt, targetDate: run.targetDate, task: { id: run.task.id, clickupTaskId: run.task.clickupTaskId, name: run.task.name, url: run.task.url }, rule: { id: run.rule.id, name: run.rule.name }, expectedMinutes: run.expectedMinutes, existingMinutes: run.existingMinutes, addedMinutes: run.addedMinutes, action, status: run.status, trigger: run.trigger, clickupTimeEntryId: run.clickupTimeEntryId, errorMessage: run.errorMessage, completedAt: run.completedAt, metadata: run.metadata };
  }
}
