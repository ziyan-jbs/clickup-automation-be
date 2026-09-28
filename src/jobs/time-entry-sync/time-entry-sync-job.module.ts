import { Module } from "@nestjs/common";

import { TimeEntrySyncJobService } from "@/jobs/time-entry-sync/time-entry-sync-job.service";
import { AutomationRuleModule } from "@/routes/automation-rule/automation-rule.module";

@Module({
  imports: [AutomationRuleModule],
  providers: [TimeEntrySyncJobService],
  exports: [TimeEntrySyncJobService],
})
export class TimeEntrySyncJobModule {}
