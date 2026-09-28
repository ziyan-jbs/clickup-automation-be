import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";

import { TokenEncryptionService } from "@/common/security/token-encryption.service";
import { AuthSession, ClickUpConnection, ClickUpWorkspace, User, UserPreference } from "@/entities";
import { ClickUpApiClient } from "@/providers/clickup/clickup-api.client";
import { ClickUpApiError } from "@/providers/clickup/clickup-api.types";
import { AuthService } from "@/routes/auth/auth.service";

describe("AuthService", () => {
  function createService() {
    let storedUser: Record<string, unknown> | null = null;
    const userQueryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => storedUser),
    };
    const userRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      findOneBy: jest.fn(async (where: { id?: string; email?: string }) => where.id ? storedUser : null),
      findOneByOrFail: jest.fn(async () => storedUser),
      createQueryBuilder: jest.fn(() => userQueryBuilder),
      create: jest.fn((value: Record<string, unknown>) => value),
      save: jest.fn(async (value: Record<string, unknown>) => {
        storedUser = { ...value, id: value.id || "usr_test" };
        return storedUser;
      }),
    };
    const sessionRepository = {
      create: jest.fn((value: Record<string, unknown>) => value),
      save: jest.fn(async (value: Record<string, unknown>) => ({ ...value, id: "ses_test" })),
    };
    const preferenceRepository = {
      findOneBy: jest.fn().mockResolvedValue(null),
      create: jest.fn((value: Record<string, unknown>) => value),
      save: jest.fn(async (value: Record<string, unknown>) => ({ ...value, id: "pref_test" })),
    };
    const connectionRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      findOneBy: jest.fn().mockResolvedValue(null),
      create: jest.fn((value: Record<string, unknown>) => value),
      save: jest.fn(async (value: Record<string, unknown>) => ({ ...value, id: "conn_test" })),
    };
    const workspaceRepository = {
      update: jest.fn().mockResolvedValue({ affected: 0 }),
      findOneBy: jest.fn().mockResolvedValue(null),
      create: jest.fn((value: Record<string, unknown>) => value),
      save: jest.fn(async (value: Record<string, unknown>) => ({ ...value, id: `wsp_${String(value.clickupWorkspaceId)}` })),
    };
    const clickUpApiClient = {
      getAuthorizedUser: jest.fn().mockResolvedValue({
        user: { id: 42, username: "Test User", email: "test@example.com" },
      }),
      getAuthorizedWorkspaces: jest.fn().mockResolvedValue([{ id: "team-1", name: "Test Workspace" }]),
    };
    const encryptionService = { encrypt: jest.fn().mockReturnValue("encrypted-token") };
    const jwtService = { signAsync: jest.fn().mockResolvedValue("app-access-token") };

    const service = new AuthService(
      userRepository as unknown as Repository<User>,
      sessionRepository as unknown as Repository<AuthSession>,
      preferenceRepository as unknown as Repository<UserPreference>,
      connectionRepository as unknown as Repository<ClickUpConnection>,
      workspaceRepository as unknown as Repository<ClickUpWorkspace>,
      clickUpApiClient as unknown as ClickUpApiClient,
      encryptionService as unknown as TokenEncryptionService,
      jwtService as unknown as JwtService,
      new ConfigService({
        security: {
          jwtAccessSecret: "test-secret",
          jwtIssuer: "test-issuer",
          jwtAudience: "test-audience",
          refreshTokenDays: 30,
        },
      }),
    );

    return {
      service,
      userRepository,
      preferenceRepository,
      connectionRepository,
      workspaceRepository,
      clickUpApiClient,
      encryptionService,
      getStoredUser: () => storedUser,
    };
  }

  it("creates a normalized password account, preferences, and an app session", async () => {
    const { service, userRepository, preferenceRepository, getStoredUser } = createService();

    const result = await service.signup("  New.User@Example.com ", "correct-password", "correct-password", { ip: "127.0.0.1" });

    const storedUser = getStoredUser();
    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "new.user@example.com", name: "new.user", isActive: true }),
    );
    expect(String(storedUser?.passwordHash)).toMatch(/^\$argon2id\$/);
    expect(String(storedUser?.passwordHash)).not.toContain("correct-password");
    expect(preferenceRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "usr_test", activeWorkspaceId: null }),
    );
    expect(result).toEqual(expect.objectContaining({ accessToken: "app-access-token", expiresIn: 900 }));
    await expect(service.getProfile("usr_test")).resolves.toEqual(expect.objectContaining({ hasPassword: true }));
  });

  it("rejects duplicate signup emails", async () => {
    const { service, userRepository } = createService();
    userRepository.findOne.mockResolvedValue({ id: "existing-user" });

    await expect(service.signup("existing@example.com", "correct-password", "correct-password", {})).rejects.toEqual(
      new ConflictException("An account with this email already exists"),
    );
  });

  it("logs a password user in and rejects an incorrect password with a generic error", async () => {
    const { service } = createService();
    await service.signup("user@example.com", "correct-password", "correct-password", {});

    await expect(service.login("USER@example.com", "correct-password", {})).resolves.toEqual(
      expect.objectContaining({ accessToken: "app-access-token" }),
    );
    await expect(service.login("user@example.com", "wrong-password", {})).rejects.toEqual(
      new UnauthorizedException("Invalid email or password"),
    );
  });

  it("lets a legacy token user configure a password exactly once", async () => {
    const { service } = createService();
    await service.loginWithClickUpToken("pk_personal-secret", {});

    await expect(service.setupPassword("usr_test", "new-password", "new-password")).resolves.toBeUndefined();
    await expect(service.setupPassword("usr_test", "other-password", "other-password")).rejects.toEqual(
      new ConflictException("Password is already configured"),
    );
  });

  it("keeps the app login email when connecting a ClickUp token", async () => {
    const { service, getStoredUser } = createService();
    await service.signup("app-login@example.com", "correct-password", "correct-password", {});

    const result = await service.connectClickUpToken("usr_test", "pk_personal-secret");

    expect(getStoredUser()).toEqual(expect.objectContaining({ email: "app-login@example.com", name: "Test User" }));
    expect(JSON.stringify(result)).not.toContain("pk_personal-secret");
    expect(JSON.stringify(result)).not.toContain("encrypted-token");
  });

  it("requires deleting an active token before switching ClickUp identities", async () => {
    const { service, connectionRepository } = createService();
    connectionRepository.findOneBy.mockResolvedValue({
      userId: "usr_test",
      clickupUserId: "different-clickup-user",
      isActive: true,
    });

    await expect(service.connectClickUpToken("usr_test", "pk_personal-secret")).rejects.toEqual(
      new ConflictException("Delete the current ClickUp token before connecting a different ClickUp account"),
    );
  });

  it("validates, encrypts, and stores a user's token before issuing an app session", async () => {
    const { service, connectionRepository, workspaceRepository, clickUpApiClient, encryptionService } = createService();

    const result = await service.loginWithClickUpToken("pk_personal-secret", { ip: "127.0.0.1" });

    expect(clickUpApiClient.getAuthorizedUser).toHaveBeenCalledWith("pk_personal-secret");
    expect(clickUpApiClient.getAuthorizedWorkspaces).toHaveBeenCalledWith("pk_personal-secret");
    expect(encryptionService.encrypt).toHaveBeenCalledWith("pk_personal-secret");
    expect(connectionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ encryptedAccessToken: "encrypted-token", clickupUserId: "42" }),
    );
    expect(workspaceRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ clickupWorkspaceId: "team-1", isAuthorized: true }),
    );
    expect(result).toEqual(expect.objectContaining({ accessToken: "app-access-token", expiresIn: 900 }));
    expect(JSON.stringify(result)).not.toContain("pk_personal-secret");
  });

  it("reports rejected personal tokens as unauthorized", async () => {
    const { service, clickUpApiClient } = createService();
    clickUpApiClient.getAuthorizedUser.mockRejectedValue(new ClickUpApiError("Token invalid", 401));

    await expect(service.loginWithClickUpToken("pk_invalid", {})).rejects.toEqual(
      new UnauthorizedException("Invalid ClickUp API token"),
    );
  });
});
