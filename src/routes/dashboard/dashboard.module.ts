import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AutomationRule, AutomationRuleRun, UserPreference } from "@/entities";
import { AuthModule } from "@/routes/auth/auth.module";
import { DashboardController } from "@/routes/dashboard/dashboard.controller";
import { DashboardService } from "@/routes/dashboard/dashboard.service";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([UserPreference, AutomationRule, AutomationRuleRun])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
