import { Controller, Get, Param, Query, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Response } from "express";

import { AuditService } from "@/routes/audit/audit.service";
import { AuthenticatedUser } from "@/routes/auth/auth.types";
import { CurrentUser } from "@/routes/auth/current-user.decorator";
import { JwtAuthGuard } from "@/routes/auth/jwt-auth.guard";
import { ListAuditQuery } from "@/routes/audit/dto/list-audit.query";

@ApiTags("audit")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("audit")
export class AuditController {
  constructor(private readonly service: AuditService) {}
  @Get("runs") list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListAuditQuery) { return this.service.list(user.id, query); }
  @Get("summary") summary(@CurrentUser() user: AuthenticatedUser, @Query() query: ListAuditQuery) { return this.service.summary(user.id, query); }
  @Get("runs/export") async export(@CurrentUser() user: AuthenticatedUser, @Query() query: ListAuditQuery, @Res() response: Response): Promise<void> {
    const csv = await this.service.exportCsv(user.id, query);
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", 'attachment; filename="clickup-automation-audit.csv"');
    response.send(csv);
  }
  @Get("runs/:id") get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.get(user.id, id); }
}
