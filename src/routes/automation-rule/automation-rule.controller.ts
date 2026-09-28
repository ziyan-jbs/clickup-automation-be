import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "@/routes/auth/auth.types";
import { CurrentUser } from "@/routes/auth/current-user.decorator";
import { JwtAuthGuard } from "@/routes/auth/jwt-auth.guard";
import { AutomationRuleService } from "@/routes/automation-rule/automation-rule.service";
import { CreateRuleDto } from "@/routes/automation-rule/dto/create-rule.dto";
import { BackfillRangeDto, DraftPreviewDto, ExecuteBackfillDto, ListRulesQuery, SetRuleStatusDto, TargetDateDto } from "@/routes/automation-rule/dto/rule-queries.dto";
import { UpdateRuleDto } from "@/routes/automation-rule/dto/update-rule.dto";

@ApiTags("automation-rules")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("automation-rules")
export class AutomationRuleController {
  constructor(private readonly service: AutomationRuleService) {}
  @Get() list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListRulesQuery) { return this.service.list(user.id, query); }
  @Get(":id") get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.get(user.id, id); }
  @Post() create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRuleDto) { return this.service.create(user.id, dto); }
  @Patch(":id") update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateRuleDto) { return this.service.update(user.id, id, dto); }
  @Patch(":id/status") status(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: SetRuleStatusDto) { return this.service.setStatus(user.id, id, dto.status); }
  @Delete(":id") @HttpCode(204) remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.remove(user.id, id); }
  @Post("preview") @HttpCode(200) draftPreview(@CurrentUser() user: AuthenticatedUser, @Body() dto: DraftPreviewDto) { return this.service.previewDraft(user.id, dto); }
  @Post(":id/preview") @HttpCode(200) preview(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: TargetDateDto) { return this.service.preview(user.id, id, dto.targetDate); }
  @Post(":id/execute") @HttpCode(200) execute(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: TargetDateDto) { return this.service.execute(user.id, id, dto.targetDate); }
  @Get(":id/runs") runs(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.listRuns(user.id, id); }
  @Post(":id/backfill/preview") backfillPreview(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: BackfillRangeDto) { return this.service.previewBackfill(user.id, id, dto); }
  @Post(":id/backfill/execute") backfill(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ExecuteBackfillDto) { return this.service.executeBackfill(user.id, id, dto.previewId); }
}

@ApiTags("automation-runs")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("automation-runs")
export class AutomationRunController {
  constructor(private readonly service: AutomationRuleService) {}
  @Post(":id/approve") approve(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.approve(user.id, id); }
  @Post(":id/reject") reject(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.reject(user.id, id); }
  @Post(":id/retry") retry(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.retry(user.id, id); }
}
