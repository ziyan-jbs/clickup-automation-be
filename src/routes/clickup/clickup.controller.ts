import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthService } from "@/routes/auth/auth.service";
import { AuthenticatedUser } from "@/routes/auth/auth.types";
import { CurrentUser } from "@/routes/auth/current-user.decorator";
import { ClickUpTokenDto } from "@/routes/auth/dto/clickup-token.dto";
import { JwtAuthGuard } from "@/routes/auth/jwt-auth.guard";
import { ClickUpService } from "@/routes/clickup/clickup.service";

@ApiTags("clickup")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("clickup")
export class ClickUpController {
  constructor(
    private readonly clickUpService: ClickUpService,
    private readonly authService: AuthService,
  ) {}

  @Post("token/connect")
  @HttpCode(200)
  connectToken(@CurrentUser() user: AuthenticatedUser, @Body() dto: ClickUpTokenDto) {
    return this.authService.connectClickUpToken(user.id, dto.apiToken);
  }

  @Delete("token")
  @HttpCode(204)
  deleteToken(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.clickUpService.deleteToken(user.id);
  }

  @Get("status")
  status(@CurrentUser() user: AuthenticatedUser) { return this.clickUpService.getConnectionStatus(user.id); }

  @Get("workspaces")
  workspaces(@CurrentUser() user: AuthenticatedUser) { return this.clickUpService.listWorkspaces(user.id); }

  @Post("workspaces/:workspaceId/select")
  select(@CurrentUser() user: AuthenticatedUser, @Param("workspaceId") workspaceId: string) {
    return this.clickUpService.selectWorkspace(user.id, workspaceId);
  }

  @Post("workspaces/:workspaceId/sync")
  sync(@CurrentUser() user: AuthenticatedUser, @Param("workspaceId") workspaceId: string) {
    return this.clickUpService.syncWorkspace(user.id, workspaceId);
  }
}
