import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ClickUpConnection, ClickUpTask, ClickUpWorkspace, UserPreference } from "@/entities";
import { AuthModule } from "@/routes/auth/auth.module";
import { ClickUpController } from "@/routes/clickup/clickup.controller";
import { ClickUpService } from "@/routes/clickup/clickup.service";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([ClickUpConnection, ClickUpWorkspace, ClickUpTask, UserPreference])],
  controllers: [ClickUpController],
  providers: [ClickUpService],
  exports: [ClickUpService],
})
export class ClickUpModule {}
