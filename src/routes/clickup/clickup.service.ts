import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, Repository } from "typeorm";

import { TokenEncryptionService } from "@/common/security/token-encryption.service";
import { AutomationRule, ClickUpConnection, ClickUpTask, ClickUpWorkspace, UserPreference } from "@/entities";
import { ClickUpApiClient } from "@/providers/clickup/clickup-api.client";
import { AutomationRuleStatus } from "@/types/automation.types";

@Injectable()
export class ClickUpService {
  constructor(
    @InjectRepository(ClickUpConnection) private readonly connectionRepository: Repository<ClickUpConnection>,
    @InjectRepository(ClickUpWorkspace) private readonly workspaceRepository: Repository<ClickUpWorkspace>,
    @InjectRepository(ClickUpTask) private readonly taskRepository: Repository<ClickUpTask>,
    @InjectRepository(UserPreference) private readonly preferenceRepository: Repository<UserPreference>,
    private readonly encryptionService: TokenEncryptionService,
    private readonly clickUpApiClient: ClickUpApiClient,
    private readonly dataSource: DataSource,
  ) {}

  async getConnectionStatus(userId: string) {
    const connection = await this.connectionRepository.findOne({ where: { userId, isActive: true } });
    return connection
      ? { connected: true, accountEmail: connection.clickupEmail, clickupUserId: connection.clickupUserId, connectedAt: connection.createdAt }
      : { connected: false };
  }

  async listWorkspaces(userId: string) {
    const preference = await this.preferenceRepository.findOneBy({ userId });
    const workspaces = await this.workspaceRepository
      .createQueryBuilder("workspace")
      .innerJoin("workspace.connection", "connection")
      .where("connection.userId = :userId", { userId })
      .andWhere("workspace.isAuthorized = true")
      .orderBy("workspace.name", "ASC")
      .getMany();
    return workspaces.map((workspace) => ({
      id: workspace.id,
      clickupWorkspaceId: workspace.clickupWorkspaceId,
      name: workspace.name,
      timezone: workspace.timezone,
      lastSyncedAt: workspace.lastSyncedAt,
      isActive: preference?.activeWorkspaceId === workspace.id,
    }));
  }

  async selectWorkspace(userId: string, workspaceId: string) {
    const workspace = await this.getOwnedWorkspace(userId, workspaceId);
    let preference = await this.preferenceRepository.findOneBy({ userId });
    preference = this.preferenceRepository.create({ ...preference, userId, activeWorkspaceId: workspace.id });
    await this.preferenceRepository.save(preference);
    return { activeWorkspaceId: workspace.id };
  }

  async syncWorkspace(userId: string, workspaceId: string) {
    const workspace = await this.getOwnedWorkspace(userId, workspaceId, true);
    const encryptedToken = workspace.connection.encryptedAccessToken;
    if (!workspace.connection.isActive || !encryptedToken) throw new NotFoundException("Connected workspace is unavailable");
    const token = this.encryptionService.decrypt(encryptedToken);
    const tasks = await this.clickUpApiClient.getAssignedTasks(token, workspace.clickupWorkspaceId, workspace.connection.clickupUserId);
    const syncedAt = new Date();

    await this.taskRepository.update({ workspaceId }, { isAvailable: false });
    for (const item of tasks) {
      const existing = await this.taskRepository.findOneBy({ workspaceId, clickupTaskId: item.id });
      await this.taskRepository.save(
        this.taskRepository.create({
          ...existing,
          workspaceId,
          clickupTaskId: item.id,
          name: item.name,
          status: item.status?.status || "unknown",
          listName: item.list?.name || null,
          spaceName: item.space?.name || null,
          assigneeClickupUserId: workspace.connection.clickupUserId,
          dueAt: item.due_date ? new Date(Number(item.due_date)) : null,
          clickupUpdatedAt: item.date_updated ? new Date(Number(item.date_updated)) : null,
          url: item.url,
          trackedMinutes: Math.max(0, Math.round(Number(item.time_spent || 0) / 60_000)),
          isClosed: item.status?.type === "closed",
          isAvailable: true,
          lastSyncedAt: syncedAt,
        }),
      );
    }
    workspace.lastSyncedAt = syncedAt;
    await this.workspaceRepository.save(workspace);
    return { workspaceId, synchronizedAt: syncedAt, taskCount: tasks.length };
  }

  async deleteToken(userId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const connectionRepository = manager.getRepository(ClickUpConnection);
      const workspaceRepository = manager.getRepository(ClickUpWorkspace);
      const taskRepository = manager.getRepository(ClickUpTask);
      const ruleRepository = manager.getRepository(AutomationRule);
      const preferenceRepository = manager.getRepository(UserPreference);
      const connection = await connectionRepository.findOneBy({ userId, isActive: true });
      if (!connection) return;

      const workspaces = await workspaceRepository.findBy({ connectionId: connection.id });
      const workspaceIds = workspaces.map((workspace) => workspace.id);
      if (workspaceIds.length) {
        const tasks = await taskRepository.find({ where: { workspaceId: In(workspaceIds) }, select: { id: true } });
        const taskIds = tasks.map((task) => task.id);
        if (taskIds.length) {
          await ruleRepository.update(
            { userId, taskId: In(taskIds), status: AutomationRuleStatus.Active },
            { status: AutomationRuleStatus.Paused },
          );
        }
        await workspaceRepository.update({ connectionId: connection.id }, { isAuthorized: false });
      }

      const preference = await preferenceRepository.findOneBy({ userId });
      if (preference?.activeWorkspaceId && workspaceIds.includes(preference.activeWorkspaceId)) {
        preference.activeWorkspaceId = null;
        await preferenceRepository.save(preference);
      }

      connection.encryptedAccessToken = null;
      connection.encryptedRefreshToken = null;
      connection.tokenExpiresAt = null;
      connection.isActive = false;
      await connectionRepository.save(connection);
    });
  }

  async getOwnedWorkspace(userId: string, workspaceId: string, includeConnection = false): Promise<ClickUpWorkspace> {
    const workspace = await this.workspaceRepository
      .createQueryBuilder("workspace")
      .innerJoinAndSelect("workspace.connection", "connection")
      .where("workspace.id = :workspaceId", { workspaceId })
      .andWhere("connection.userId = :userId", { userId })
      .andWhere("workspace.isAuthorized = true")
      .getOne();
    if (!workspace) throw new NotFoundException("Workspace not found");
    if (!includeConnection) delete (workspace as Partial<ClickUpWorkspace>).connection;
    return workspace;
  }
}
