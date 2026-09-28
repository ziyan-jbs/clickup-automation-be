import { createHash, randomBytes } from "node:crypto";

import * as argon2 from "argon2";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThan, Repository } from "typeorm";

import { TokenEncryptionService } from "@/common/security/token-encryption.service";
import {
  AuthSession,
  ClickUpConnection,
  ClickUpWorkspace,
  User,
  UserPreference,
} from "@/entities";
import { ClickUpApiClient } from "@/providers/clickup/clickup-api.client";
import { ClickUpApiError, ClickUpAuthorizedUser, ClickUpWorkspaceDto } from "@/providers/clickup/clickup-api.types";

interface ClickUpCredentialResult {
  user: User;
  connection: ClickUpConnection;
  workspaces: ClickUpWorkspace[];
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(AuthSession) private readonly sessionRepository: Repository<AuthSession>,
    @InjectRepository(UserPreference) private readonly preferenceRepository: Repository<UserPreference>,
    @InjectRepository(ClickUpConnection) private readonly connectionRepository: Repository<ClickUpConnection>,
    @InjectRepository(ClickUpWorkspace) private readonly workspaceRepository: Repository<ClickUpWorkspace>,
    private readonly clickUpApiClient: ClickUpApiClient,
    private readonly encryptionService: TokenEncryptionService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async getAuthorizationUrl(returnTo = "/dashboard"): Promise<string> {
    const clientId = this.configService.get<string>("clickup.clientId");
    const redirectUri = this.configService.get<string>("clickup.redirectUri");
    if (!clientId || !redirectUri) throw new ServiceUnavailableException("ClickUp OAuth is not configured");
    const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard";
    const state = await this.jwtService.signAsync(
      { purpose: "clickup_oauth", returnTo: safeReturnTo },
      { secret: this.accessSecret, expiresIn: 600, issuer: this.issuer, audience: this.audience },
    );
    const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, state });
    return `https://app.clickup.com/api?${params.toString()}`;
  }

  async completeOAuth(code: string, state: string, context: { ip?: string; userAgent?: string }) {
    const stateClaims = await this.verifyOAuthState(state);
    const accessToken = await this.clickUpApiClient.exchangeCode(code);
    const { user } = await this.persistClickUpCredential(accessToken);
    const session = await this.createSession(user.id, context);
    return { ...session, returnTo: String(stateClaims.returnTo || "/dashboard") };
  }

  async signup(emailInput: string, password: string, confirmPassword: string, context: { ip?: string; userAgent?: string }) {
    this.assertPasswordsMatch(password, confirmPassword);
    const email = this.normalizeEmail(emailInput);
    const existing = await this.userRepository.findOne({ where: { email }, withDeleted: true });
    if (existing) throw new ConflictException("An account with this email already exists");

    const user = await this.userRepository.save(
      this.userRepository.create({
        email,
        name: email.split("@")[0].slice(0, 160),
        passwordHash: await this.hashPassword(password),
        timezone: "Asia/Karachi",
        isActive: true,
      }),
    );
    await this.preferenceRepository.save(
      this.preferenceRepository.create({ userId: user.id, timezone: user.timezone, activeWorkspaceId: null }),
    );
    return this.createSession(user.id, context);
  }

  async login(emailInput: string, password: string, context: { ip?: string; userAgent?: string }) {
    const email = this.normalizeEmail(emailInput);
    const user = await this.userRepository
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("user.email = :email", { email })
      .getOne();
    if (!user?.isActive || !user.passwordHash || !await this.passwordMatches(user.passwordHash, password)) {
      throw new UnauthorizedException("Invalid email or password");
    }
    return this.createSession(user.id, context);
  }

  async setupPassword(userId: string, password: string, confirmPassword: string): Promise<void> {
    this.assertPasswordsMatch(password, confirmPassword);
    const user = await this.userRepository
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("user.id = :userId", { userId })
      .getOne();
    if (!user || !user.isActive) throw new UnauthorizedException("User account not found");
    if (user.passwordHash) throw new ConflictException("Password is already configured");
    user.passwordHash = await this.hashPassword(password);
    await this.userRepository.save(user);
  }

  async loginWithClickUpToken(apiToken: string, context: { ip?: string; userAgent?: string }) {
    const { user } = await this.persistClickUpCredential(apiToken, undefined, true);
    return this.createSession(user.id, context);
  }

  async connectClickUpToken(userId: string, apiToken: string) {
    const { connection, workspaces } = await this.persistClickUpCredential(apiToken, userId, true);
    return {
      connected: true,
      accountEmail: connection.clickupEmail,
      clickupUserId: connection.clickupUserId,
      workspaceCount: workspaces.length,
    };
  }

  private async persistClickUpCredential(
    token: string,
    expectedUserId?: string,
    personalToken = false,
  ): Promise<ClickUpCredentialResult> {
    const [{ user: clickupUser }, authorizedWorkspaces] = await this.validateClickUpCredential(token, personalToken);
    const email = clickupUser.email.toLowerCase();

    const activeConnection = expectedUserId
      ? await this.connectionRepository.findOneBy({ userId: expectedUserId, isActive: true })
      : null;
    if (activeConnection && activeConnection.clickupUserId !== String(clickupUser.id)) {
      throw new ConflictException("Delete the current ClickUp token before connecting a different ClickUp account");
    }

    let connection = await this.connectionRepository.findOne({
      where: { clickupUserId: String(clickupUser.id) },
      relations: { user: true },
    });
    if (expectedUserId && connection && connection.userId !== expectedUserId) {
      throw new ConflictException("This ClickUp account is already connected to another user");
    }

    let user = expectedUserId
      ? await this.userRepository.findOneBy({ id: expectedUserId })
      : connection?.user || await this.userRepository.findOneBy({ email });
    if (expectedUserId && !user) throw new UnauthorizedException("User account not found");

    if (!user) {
      user = await this.userRepository.save(
        this.userRepository.create({ email, name: clickupUser.username, passwordHash: null, timezone: "Asia/Karachi", isActive: true }),
      );
    } else {
      if (!expectedUserId) {
        const emailOwner = await this.userRepository.findOneBy({ email });
        if (emailOwner && emailOwner.id !== user.id) {
          throw new ConflictException("This ClickUp email is already associated with another user");
        }
        user.email = email;
      }
      user.name = clickupUser.username;
      user.isActive = true;
      user = await this.userRepository.save(user);
    }

    connection = await this.connectionRepository.save(
      this.connectionRepository.create({
        ...connection,
        userId: user.id,
        clickupUserId: String(clickupUser.id),
        clickupEmail: email,
        encryptedAccessToken: this.encryptionService.encrypt(token),
        encryptedRefreshToken: null,
        tokenExpiresAt: null,
        isActive: true,
      }),
    );

    await this.workspaceRepository.update({ connectionId: connection.id }, { isAuthorized: false });
    const workspaces: ClickUpWorkspace[] = [];
    for (const item of authorizedWorkspaces) {
      const existing = await this.workspaceRepository.findOneBy({ connectionId: connection.id, clickupWorkspaceId: String(item.id) });
      workspaces.push(
        await this.workspaceRepository.save(
          this.workspaceRepository.create({ ...existing, connectionId: connection.id, clickupWorkspaceId: String(item.id), name: item.name, timezone: user.timezone, isAuthorized: true }),
        ),
      );
    }

    let preference = await this.preferenceRepository.findOneBy({ userId: user.id });
    if (!preference) {
      preference = await this.preferenceRepository.save(
        this.preferenceRepository.create({ userId: user.id, timezone: user.timezone, activeWorkspaceId: workspaces[0]?.id || null }),
      );
    } else {
      const activeWorkspaceIsAuthorized = workspaces.some((workspace) => workspace.id === preference?.activeWorkspaceId);
      if (!activeWorkspaceIsAuthorized) {
        preference.activeWorkspaceId = workspaces[0]?.id || null;
        await this.preferenceRepository.save(preference);
      }
    }

    return { user, connection, workspaces };
  }

  private async validateClickUpCredential(
    token: string,
    personalToken: boolean,
  ): Promise<[ClickUpAuthorizedUser, ClickUpWorkspaceDto[]]> {
    try {
      return await Promise.all([
        this.clickUpApiClient.getAuthorizedUser(token),
        this.clickUpApiClient.getAuthorizedWorkspaces(token),
      ]);
    } catch (error) {
      if (personalToken && error instanceof ClickUpApiError && (error.status === 401 || error.status === 403)) {
        throw new UnauthorizedException("Invalid ClickUp API token");
      }
      throw error;
    }
  }

  async refresh(rawToken: string | undefined, context: { ip?: string; userAgent?: string }) {
    if (!rawToken) throw new UnauthorizedException("Missing refresh token");
    const session = await this.sessionRepository.findOne({
      where: { refreshTokenHash: this.hashToken(rawToken), expiresAt: MoreThan(new Date()) },
      relations: { user: true },
    });
    if (!session || session.revokedAt || !session.user.isActive) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
    session.revokedAt = new Date();
    session.lastUsedAt = new Date();
    await this.sessionRepository.save(session);
    return this.createSession(session.userId, context);
  }

  async logout(rawToken?: string): Promise<void> {
    if (!rawToken) return;
    const session = await this.sessionRepository.findOneBy({ refreshTokenHash: this.hashToken(rawToken) });
    if (session && !session.revokedAt) {
      session.revokedAt = new Date();
      await this.sessionRepository.save(session);
    }
  }

  async getProfile(userId: string) {
    const user = await this.userRepository
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .leftJoinAndSelect("user.preference", "preference")
      .leftJoinAndSelect("preference.activeWorkspace", "activeWorkspace")
      .where("user.id = :userId", { userId })
      .getOne();
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      hasPassword: Boolean(user.passwordHash),
      timezone: user.preference?.timezone || user.timezone,
      activeWorkspace: user.preference?.activeWorkspace || null,
    };
  }

  private async createSession(userId: string, context: { ip?: string; userAgent?: string }) {
    const user = await this.userRepository.findOneByOrFail({ id: userId });
    const rawRefreshToken = randomBytes(48).toString("base64url");
    const expiresAt = new Date(Date.now() + this.refreshDays * 86_400_000);
    const session = await this.sessionRepository.save(
      this.sessionRepository.create({ userId, refreshTokenHash: this.hashToken(rawRefreshToken), expiresAt, revokedAt: null, lastUsedAt: null, ip: context.ip || null, userAgent: context.userAgent || null }),
    );
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, sid: session.id, email: user.email },
      { secret: this.accessSecret, expiresIn: 900, issuer: this.issuer, audience: this.audience },
    );
    return { accessToken, expiresIn: 900, refreshToken: rawRefreshToken, refreshExpiresAt: expiresAt };
  }

  private async verifyOAuthState(state: string): Promise<Record<string, unknown>> {
    try {
      const claims = await this.jwtService.verifyAsync<Record<string, unknown>>(state, { secret: this.accessSecret, issuer: this.issuer, audience: this.audience });
      if (claims.purpose !== "clickup_oauth") throw new Error();
      return claims;
    } catch {
      throw new UnauthorizedException("Invalid or expired OAuth state");
    }
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private assertPasswordsMatch(password: string, confirmPassword: string): void {
    if (password !== confirmPassword) throw new BadRequestException("Passwords do not match");
  }

  private hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  private async passwordMatches(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  private get accessSecret(): string { return this.configService.get<string>("security.jwtAccessSecret") || ""; }
  private get issuer(): string { return this.configService.get<string>("security.jwtIssuer") || "clickup-automation-api"; }
  private get audience(): string { return this.configService.get<string>("security.jwtAudience") || "clickup-automation-web"; }
  private get refreshDays(): number { return this.configService.get<number>("security.refreshTokenDays") || 30; }
}
