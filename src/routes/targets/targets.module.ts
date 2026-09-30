import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SalesTarget } from "@/entities/sales-target.entity";
import { TargetSeries } from "@/entities/target-series.entity";
import { AuthModule } from "@/routes/auth/auth.module";
import { TargetsController } from "./targets.controller";
import { TargetsService } from "./targets.service";
@Module({ imports: [TypeOrmModule.forFeature([SalesTarget, TargetSeries]), AuthModule], controllers: [TargetsController], providers: [TargetsService] })
export class TargetsModule {}
