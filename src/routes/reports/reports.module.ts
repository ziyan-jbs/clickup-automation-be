import { Module } from "@nestjs/common"; import { AuthModule } from "@/routes/auth/auth.module"; import { ReportsController } from "@/routes/reports/reports.controller"; import { ReportsService } from "@/routes/reports/reports.service";
@Module({ imports: [AuthModule], controllers: [ReportsController], providers: [ReportsService] }) export class ReportsModule {}
