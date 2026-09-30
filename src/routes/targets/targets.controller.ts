import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@/entities/user.entity";
import { CurrentUser } from "@/routes/auth/current-user.decorator";
import { AuthenticatedUser } from "@/routes/auth/auth.types";
import { JwtAuthGuard } from "@/routes/auth/jwt-auth.guard";
import { Roles } from "@/routes/auth/roles.decorator";
import { RolesGuard } from "@/routes/auth/roles.guard";
import { AssignTargetsDto, TargetFiltersDto, TargetResponseDto, TargetSeriesResponseDto, UpdateSeriesDto, UpdateTargetDto } from "./targets.dto";
import { TargetsService } from "./targets.service";
@ApiTags("Targets") @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Controller("targets")
export class TargetsController {
  constructor(private readonly targets: TargetsService) {}
  @Post() @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN) @ApiCreatedResponse({ type: TargetResponseDto, isArray: true })
  assign(@CurrentUser() user: AuthenticatedUser, @Body() body: AssignTargetsDto) { return this.targets.assign(user, body); }
  @Get("me") @Roles(UserRole.SALES_REP) @ApiOkResponse({ type: TargetResponseDto, isArray: true })
  mine(@CurrentUser() user: AuthenticatedUser, @Query() filters: TargetFiltersDto) { return this.targets.list({ ...filters, repId: user.id }); }
  @Get() @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN) @ApiOkResponse({ type: TargetResponseDto, isArray: true })
  team(@Query() filters: TargetFiltersDto) { return this.targets.list(filters); }
  @Get("series") @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN) @ApiOkResponse({ type: TargetSeriesResponseDto, isArray: true })
  series() { return this.targets.listSeries(); }
  @Get(":id") @ApiOkResponse({ type: TargetResponseDto })
  get(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) { return this.targets.get(id, user); }
  @Patch("series/:id") @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN) @ApiOkResponse({ type: TargetResponseDto, isArray: true })
  updateSeries(@Param("id") id: string, @Body() body: UpdateSeriesDto) { return this.targets.updateSeries(id, body); }
  @Patch(":id") @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN) @ApiOkResponse({ type: TargetResponseDto })
  update(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser, @Body() body: UpdateTargetDto) { return this.targets.update(id, user, body); }
}
