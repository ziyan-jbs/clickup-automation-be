import { Controller, Post, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";

import { InternalApiKeyGuard } from "@/routes/job-trigger/internal-api-key.guard";
import { JobTriggerService } from "@/routes/job-trigger/job-trigger.service";

@ApiTags("operations")
@Controller("job-trigger")
export class JobTriggerController {
  constructor(private readonly service: JobTriggerService) {}
  @Post("time-entry-sync")
  @ApiHeader({ name: "X-Internal-Key", required: true })
  @UseGuards(InternalApiKeyGuard)
  trigger() { return this.service.triggerTimeEntrySync(); }
}
