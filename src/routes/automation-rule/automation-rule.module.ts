import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AutomationRule, AutomationRuleRun, ClickUpTask, UserPreference } from "@/entities";
import { AuthModule } from "@/routes/auth/auth.module";
import { AutomationRuleController, AutomationRunController } from "@/routes/automation-rule/automation-rule.controller";
import { AutomationRuleService } from "@/routes/automation-rule/automation-rule.service";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([AutomationRule, AutomationRuleRun, ClickUpTask, UserPreference])],
  controllers: [AutomationRuleController, AutomationRunController],
  providers: [AutomationRuleService],
  exports: [AutomationRuleService],
})
export class AutomationRuleModule {}
