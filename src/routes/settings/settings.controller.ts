import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthenticatedUser } from "@/routes/auth/auth.types";
import { CurrentUser } from "@/routes/auth/current-user.decorator";
import { JwtAuthGuard } from "@/routes/auth/jwt-auth.guard";
import { UpdateSettingsDto } from "@/routes/settings/dto/update-settings.dto";
import { SettingsService } from "@/routes/settings/settings.service";

@ApiTags("settings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("settings")
export class SettingsController {
  constructor(private readonly service: SettingsService) {}
  @Get() get(@CurrentUser() user: AuthenticatedUser) { return this.service.get(user.id); }
  @Patch() update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateSettingsDto) { return this.service.update(user.id, dto); }
}
