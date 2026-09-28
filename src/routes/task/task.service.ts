import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, Repository } from "typeorm";

import { ClickUpTask, UserPreference } from "@/entities";
import { ListTasksQuery } from "@/routes/task/dto/list-tasks.query";

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(ClickUpTask) private readonly taskRepository: Repository<ClickUpTask>,
    @InjectRepository(UserPreference) private readonly preferenceRepository: Repository<UserPreference>,
  ) {}

  async list(userId: string, query: ListTasksQuery) {
    const workspaceId = await this.resolveWorkspaceId(userId, query.workspaceId);
    const builder = this.ownedTasksQuery(userId)
      .andWhere("task.workspaceId = :workspaceId", { workspaceId })
      .andWhere("task.isAvailable = true");
    if (!query.includeClosed) builder.andWhere("task.isClosed = false");
    if (query.status && query.status !== "all") builder.andWhere("LOWER(task.status) = LOWER(:status)", { status: query.status });
    if (query.list && query.list !== "all") builder.andWhere("task.listName = :list", { list: query.list });
    if (query.search) {
      builder.andWhere(new Brackets((where) => where.where("task.name ILIKE :search", { search: `%${query.search}%` }).orWhere("task.clickupTaskId ILIKE :search", { search: `%${query.search}%` })));
    }
    if (query.dueFrom) builder.andWhere("task.dueAt >= :dueFrom", { dueFrom: query.dueFrom });
    if (query.dueTo) builder.andWhere("task.dueAt < (:dueTo::date + interval '1 day')", { dueTo: query.dueTo });

    const [tasks, total] = await builder.orderBy("task.clickupUpdatedAt", "DESC", "NULLS LAST").skip((query.page - 1) * query.pageSize).take(query.pageSize).getManyAndCount();
    const facetRows = await this.taskRepository.createQueryBuilder("task").select("task.status", "status").addSelect("task.listName", "list").where("task.workspaceId = :workspaceId", { workspaceId }).andWhere("task.isAvailable = true").getRawMany<{ status: string; list: string | null }>();
    return {
      items: tasks.map((task) => this.serialize(task)),
      meta: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize), statuses: [...new Set(facetRows.map((row) => row.status))].sort(), lists: [...new Set(facetRows.map((row) => row.list).filter(Boolean))].sort() },
    };
  }

  async get(userId: string, id: string) {
    const task = await this.ownedTasksQuery(userId).andWhere("task.id = :id", { id }).getOne();
    if (!task) throw new NotFoundException("Task not found");
    return this.serialize(task);
  }

  private ownedTasksQuery(userId: string) {
    return this.taskRepository.createQueryBuilder("task").innerJoinAndSelect("task.workspace", "workspace").innerJoin("workspace.connection", "connection").where("connection.userId = :userId", { userId });
  }

  private async resolveWorkspaceId(userId: string, requested?: string): Promise<string> {
    if (requested) return requested;
    const preference = await this.preferenceRepository.findOneBy({ userId });
    if (!preference?.activeWorkspaceId) throw new NotFoundException("Select an active workspace first");
    return preference.activeWorkspaceId;
  }

  private serialize(task: ClickUpTask) {
    return { id: task.id, clickupTaskId: task.clickupTaskId, name: task.name, status: task.status, list: task.listName, space: task.spaceName, dueAt: task.dueAt, clickupUpdatedAt: task.clickupUpdatedAt, trackedMinutes: task.trackedMinutes, isClosed: task.isClosed, url: task.url, workspace: task.workspace ? { id: task.workspace.id, name: task.workspace.name } : undefined, lastSyncedAt: task.lastSyncedAt };
  }
}
