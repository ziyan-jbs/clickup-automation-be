import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@/entities/user.entity";
import { JwtAuthGuard } from "@/routes/auth/jwt-auth.guard";
import { Roles } from "@/routes/auth/roles.decorator";
import { RolesGuard } from "@/routes/auth/roles.guard";
import { ReportQuery } from "@/routes/reports/reports.dto";
import { ReportsService } from "@/routes/reports/reports.service";
import {
  DashboardResponseDto,
  ProductsReportResponseDto,
  RepsReportResponseDto,
  ShopsReportResponseDto,
  TrendReportResponseDto,
} from "@/swagger/report-response.dto";
@ApiTags("Reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}
  @Get("dashboard")
  @ApiOkResponse({ type: DashboardResponseDto })
  dashboard(@Query() q: ReportQuery) {
    return this.reports.dashboard(q);
  }
  @Get("products")
  @ApiOkResponse({ type: ProductsReportResponseDto })
  products(@Query() q: ReportQuery) {
    return this.reports.topProducts(q);
  }
  @Get("shops") @ApiOkResponse({ type: ShopsReportResponseDto }) shops(@Query() q: ReportQuery) {
    return this.reports.shops(q);
  }
  @Get("shops/:id/products") @ApiOkResponse({ type: ProductsReportResponseDto }) shopProducts(
    @Param("id") id: string,
    @Query() q: ReportQuery,
  ) {
    return this.reports.shopBreakdown(id, q);
  }
  @Get("reps") @ApiOkResponse({ type: RepsReportResponseDto }) reps(@Query() q: ReportQuery) {
    return this.reports.reps(q);
  }
  @Get("trend") @ApiOkResponse({ type: TrendReportResponseDto }) trend(@Query() q: ReportQuery) {
    return this.reports.trend(q);
  }
}
