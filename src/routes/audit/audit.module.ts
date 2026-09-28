import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuditLog, AutomationRuleRun } from "@/entities";
import { AuthModule } from "@/routes/auth/auth.module";
import { AuditController } from "@/routes/audit/audit.controller";
import { AuditService } from "@/routes/audit/audit.service";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([AuditLog, AutomationRuleRun])],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
