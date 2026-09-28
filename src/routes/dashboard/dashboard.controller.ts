import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "@/routes/auth/auth.types";
import { CurrentUser } from "@/routes/auth/current-user.decorator";
import { JwtAuthGuard } from "@/routes/auth/jwt-auth.guard";
import { DashboardService } from "@/routes/dashboard/dashboard.service";

@ApiTags("dashboard")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly service: DashboardService) {}
  @Get() get(@CurrentUser() user: AuthenticatedUser, @Query("workspaceId") workspaceId?: string) { return this.service.get(user.id, workspaceId); }
}
