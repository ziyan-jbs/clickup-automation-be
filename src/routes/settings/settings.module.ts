import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ClickUpConnection, ClickUpWorkspace, User, UserPreference } from "@/entities";
import { AuthModule } from "@/routes/auth/auth.module";
import { SettingsController } from "@/routes/settings/settings.controller";
import { SettingsService } from "@/routes/settings/settings.service";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([User, UserPreference, ClickUpWorkspace, ClickUpConnection])],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
