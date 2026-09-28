import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DateTime } from "luxon";
import { Repository } from "typeorm";

import { AutomationRule, AutomationRuleRun, UserPreference } from "@/entities";
import { AutomationRuleStatus, AutomationRunStatus } from "@/types/automation.types";

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(UserPreference) private readonly preferenceRepository: Repository<UserPreference>,
    @InjectRepository(AutomationRule) private readonly ruleRepository: Repository<AutomationRule>,
    @InjectRepository(AutomationRuleRun) private readonly runRepository: Repository<AutomationRuleRun>,
  ) {}

  async get(userId: string, requestedWorkspaceId?: string) {
    const preference = await this.preferenceRepository.findOneBy({ userId });
    const workspaceId = requestedWorkspaceId || preference?.activeWorkspaceId;
    if (!preference || !workspaceId) throw new NotFoundException("Select an active workspace first");
    const now = DateTime.now().setZone(preference.timezone);
    const weekStart = now.startOf("week").toISODate() as string;
    const previousWeekStart = now.minus({ weeks: 1 }).startOf("week").toISODate() as string;
    const previousWeekEnd = now.startOf("week").minus({ days: 1 }).toISODate() as string;

    const ruleQuery = this.ruleRepository.createQueryBuilder("rule").innerJoinAndSelect("rule.task", "task").where("rule.userId = :userId", { userId }).andWhere("task.workspaceId = :workspaceId", { workspaceId });
    const rules = await ruleQuery.orderBy("rule.createdAt", "DESC").getMany();
    const runs = await this.runRepository.createQueryBuilder("run").innerJoinAndSelect("run.rule", "rule").innerJoinAndSelect("run.task", "task").where("run.userId = :userId", { userId }).andWhere("task.workspaceId = :workspaceId", { workspaceId }).andWhere("run.targetDate >= :previousWeekStart", { previousWeekStart }).orderBy("run.createdAt", "DESC").getMany();

    const currentWeek = runs.filter((run) => run.targetDate >= weekStart);
    const previousWeek = runs.filter((run) => run.targetDate >= previousWeekStart && run.targetDate <= previousWeekEnd);
    const currentAdded = currentWeek.reduce((sum, run) => sum + (run.addedMinutes || 0), 0);
    const previousAdded = previousWeek.reduce((sum, run) => sum + (run.addedMinutes || 0), 0);
    const trendPercent = previousAdded ? Math.round(((currentAdded - previousAdded) / previousAdded) * 100) : currentAdded ? 100 : 0;
    const activeRules = rules.filter((rule) => rule.status === AutomationRuleStatus.Active);

    const dailyPerformance = Array.from({ length: 7 }, (_, index) => {
      const date = now.minus({ days: 6 - index }).toISODate() as string;
      return { date, addedMinutes: runs.filter((run) => run.targetDate === date).reduce((sum, run) => sum + (run.addedMinutes || 0), 0) };
    });

    return {
      summary: {
        status: activeRules.length ? "active" : "paused",
        nextRun: activeRules.length ? `${now.plus({ days: 1 }).toISODate()}T${preference.runTime}:00` : null,
        hoursAddedThisWeek: Number((currentAdded / 60).toFixed(2)),
        minutesAddedThisWeek: currentAdded,
        skippedCount: currentWeek.filter((run) => run.status === AutomationRunStatus.Skipped).length,
        failedJobs: currentWeek.filter((run) => run.status === AutomationRunStatus.Failed).length,
        awaitingApprovalCount: currentWeek.filter((run) => run.status === AutomationRunStatus.AwaitingApproval).length,
        trendPercent,
      },
      dailyPerformance,
      recentActivity: runs.slice(0, 5).map((run) => ({ id: run.id, targetDate: run.targetDate, taskName: run.task.name, taskCode: run.task.clickupTaskId, ruleName: run.rule.name, addedMinutes: run.addedMinutes, status: run.status, occurredAt: run.createdAt })),
      upcomingRules: activeRules.slice(0, 10).map((rule) => ({ id: rule.id, name: rule.name, taskId: rule.task.id, taskName: rule.task.name, minutesPerDay: rule.minutesPerDay, daysOfWeek: rule.daysOfWeek, nextRunAt: rule.nextRunAt, status: rule.status })),
    };
  }
}
