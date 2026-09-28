import { DataSource, EntityManager, Repository } from "typeorm";

import { TokenEncryptionService } from "@/common/security/token-encryption.service";
import { AutomationRule, ClickUpConnection, ClickUpTask, ClickUpWorkspace, UserPreference } from "@/entities";
import { ClickUpApiClient } from "@/providers/clickup/clickup-api.client";
import { ClickUpService } from "@/routes/clickup/clickup.service";
import { AutomationRuleStatus } from "@/types/automation.types";

describe("ClickUpService token lifecycle", () => {
  it("removes the token while retaining data and pausing affected rules", async () => {
    const connection = {
      id: "conn_test",
      userId: "usr_test",
      encryptedAccessToken: "encrypted-token",
      encryptedRefreshToken: "encrypted-refresh",
      tokenExpiresAt: new Date(),
      isActive: true,
    };
    const preference = { userId: "usr_test", activeWorkspaceId: "wsp_test" };
    const connectionRepository = {
      findOneBy: jest.fn().mockResolvedValue(connection),
      save: jest.fn(async (value: object) => value),
    };
    const workspaceRepository = {
      findBy: jest.fn().mockResolvedValue([{ id: "wsp_test", connectionId: "conn_test" }]),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const taskRepository = {
      find: jest.fn().mockResolvedValue([{ id: "task_test" }]),
    };
    const ruleRepository = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const preferenceRepository = {
      findOneBy: jest.fn().mockResolvedValue(preference),
      save: jest.fn(async (value: object) => value),
    };
    const repositories = new Map<unknown, unknown>([
      [ClickUpConnection, connectionRepository],
      [ClickUpWorkspace, workspaceRepository],
      [ClickUpTask, taskRepository],
      [AutomationRule, ruleRepository],
      [UserPreference, preferenceRepository],
    ]);
    const manager = { getRepository: jest.fn((entity: unknown) => repositories.get(entity)) };
    const dataSource = {
      transaction: jest.fn(async (work: (entityManager: EntityManager) => Promise<void>) => work(manager as unknown as EntityManager)),
    };
    const service = new ClickUpService(
      {} as Repository<ClickUpConnection>,
      {} as Repository<ClickUpWorkspace>,
      {} as Repository<ClickUpTask>,
      {} as Repository<UserPreference>,
      {} as TokenEncryptionService,
      {} as ClickUpApiClient,
      dataSource as unknown as DataSource,
    );

    await service.deleteToken("usr_test");

    expect(ruleRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "usr_test", status: AutomationRuleStatus.Active }),
      { status: AutomationRuleStatus.Paused },
    );
    expect(workspaceRepository.update).toHaveBeenCalledWith({ connectionId: "conn_test" }, { isAuthorized: false });
    expect(preferenceRepository.save).toHaveBeenCalledWith(expect.objectContaining({ activeWorkspaceId: null }));
    expect(connectionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ encryptedAccessToken: null, encryptedRefreshToken: null, tokenExpiresAt: null, isActive: false }),
    );
  });
});
