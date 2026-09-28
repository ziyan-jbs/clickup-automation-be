import { Module } from "@nestjs/common";

import { TimeEntrySyncJobModule } from "@/jobs/time-entry-sync/time-entry-sync-job.module";
import { JobTriggerController } from "@/routes/job-trigger/job-trigger.controller";
import { JobTriggerService } from "@/routes/job-trigger/job-trigger.service";
import { InternalApiKeyGuard } from "@/routes/job-trigger/internal-api-key.guard";

@Module({
  imports: [TimeEntrySyncJobModule],
  controllers: [JobTriggerController],
  providers: [JobTriggerService, InternalApiKeyGuard],
})
export class JobTriggerModule {}
