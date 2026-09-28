import { Injectable } from "@nestjs/common";

import { TimeEntrySyncJobService } from "@/jobs/time-entry-sync/time-entry-sync-job.service";

@Injectable()
export class JobTriggerService {
  constructor(private readonly job: TimeEntrySyncJobService) {}
  triggerTimeEntrySync() { return this.job.runScheduledSync(); }
}
