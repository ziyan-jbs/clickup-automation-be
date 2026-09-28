import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { assertTimezone } from "@/common/date-time/date-time.helper";
import { ClickUpConnection, ClickUpWorkspace, User, UserPreference } from "@/entities";
import { UpdateSettingsDto } from "@/routes/settings/dto/update-settings.dto";

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(UserPreference) private readonly preferenceRepository: Repository<UserPreference>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(ClickUpWorkspace) private readonly workspaceRepository: Repository<ClickUpWorkspace>,
    @InjectRepository(ClickUpConnection) private readonly connectionRepository: Repository<ClickUpConnection>,
  ) {}

  async get(userId: string) {
    const [user, preference, connection] = await Promise.all([
      this.userRepository.findOneBy({ id: userId }),
      this.preferenceRepository.findOne({ where: { userId }, relations: { activeWorkspace: true } }),
      this.connectionRepository.findOneBy({ userId, isActive: true }),
    ]);
    if (!user || !preference) throw new NotFoundException("Settings not found");
    return this.serialize(user, preference, connection);
  }

  async update(userId: string, dto: UpdateSettingsDto) {
    const preference = await this.preferenceRepository.findOne({ where: { userId }, relations: { activeWorkspace: true } });
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!preference || !user) throw new NotFoundException("Settings not found");
    if (dto.timezone) assertTimezone(dto.timezone);
    if (dto.activeWorkspaceId) await this.assertWorkspaceOwnership(userId, dto.activeWorkspaceId);
    Object.assign(preference, dto);
    if (dto.timezone) {
      user.timezone = dto.timezone;
      await this.userRepository.save(user);
    }
    await this.preferenceRepository.save(preference);
    return this.get(userId);
  }

  private async assertWorkspaceOwnership(userId: string, workspaceId: string): Promise<void> {
    const count = await this.workspaceRepository.createQueryBuilder("workspace").innerJoin("workspace.connection", "connection").where("workspace.id = :workspaceId", { workspaceId }).andWhere("connection.userId = :userId", { userId }).andWhere("workspace.isAuthorized = true").getCount();
    if (!count) throw new NotFoundException("Workspace not found");
  }

  private serialize(user: User, preference: UserPreference, connection: ClickUpConnection | null) {
    return {
      user: { id: user.id, name: user.name, email: user.email },
      connection: connection ? { accountEmail: connection.clickupEmail, connected: connection.isActive } : { connected: false },
      activeWorkspace: preference.activeWorkspace ? { id: preference.activeWorkspace.id, name: preference.activeWorkspace.name, lastSyncedAt: preference.activeWorkspace.lastSyncedAt } : null,
      timezone: preference.timezone,
      runTime: preference.runTime,
      defaultDailyMinutes: preference.defaultDailyMinutes,
      defaultEntryStartTime: preference.defaultEntryStartTime,
      emailNotifications: preference.emailNotifications,
      pushNotifications: preference.pushNotifications,
      notificationDeliveryAvailable: false,
    };
  }
}
