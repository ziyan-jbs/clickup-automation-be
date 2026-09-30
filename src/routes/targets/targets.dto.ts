import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from "class-validator";
import { TargetCadence, TargetMetric } from "./targets.logic";
export class AssignTargetsDto {
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMinSize(1) @IsString({ each: true }) repIds: string[];
  @ApiProperty({ enum: TargetMetric }) @IsEnum(TargetMetric) metric: TargetMetric;
  @ApiProperty({ enum: TargetCadence }) @IsEnum(TargetCadence) cadence: TargetCadence;
  @ApiProperty({ example: "2026-09-28", description: "Any date in the first target period, Asia/Karachi" }) @Matches(/^\d{4}-\d{2}-\d{2}$/) periodStart: string;
  @ApiProperty({ type: "integer", minimum: 1, maximum: 2147483647, description: "PKR minor units for sales value, otherwise whole boxes or shops" }) @IsInt() @Min(1) @Max(2147483647) goalAmount: number;
  @ApiProperty({ default: false }) @IsBoolean() repeat: boolean;
}
export class TargetFiltersDto {
  @ApiPropertyOptional() @IsOptional() @IsString() repId?: string;
  @ApiPropertyOptional({ enum: TargetMetric }) @IsOptional() @IsEnum(TargetMetric) metric?: TargetMetric;
  @ApiPropertyOptional({ enum: TargetCadence }) @IsOptional() @IsEnum(TargetCadence) cadence?: TargetCadence;
  @ApiPropertyOptional({ enum: ["current", "upcoming", "history", "all"] }) @IsOptional() @IsEnum(["current", "upcoming", "history", "all"]) scope?: "current" | "upcoming" | "history" | "all";
}
export class UpdateTargetDto {
  @ApiPropertyOptional({ type: "integer", minimum: 1 }) @IsOptional() @IsInt() @Min(1) @Max(2147483647) goalAmount?: number;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() cancel?: boolean;
}
export class UpdateSeriesDto {
  @ApiPropertyOptional({ type: "integer", minimum: 1 }) @IsOptional() @IsInt() @Min(1) @Max(2147483647) goalAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() paused?: boolean;
}
export class TargetDeliveryDto {
  @ApiProperty() orderId: string;
  @ApiProperty() orderNumber: string;
  @ApiProperty() shopId: string;
  @ApiProperty() shopName: string;
  @ApiProperty() deliveredAt: Date;
  @ApiProperty() deliveredTotalMinor: number;
  @ApiProperty() deliveredBoxes: number;
}
export class TargetResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() repId: string;
  @ApiProperty() repName: string;
  @ApiProperty() assignedById: string;
  @ApiProperty() assignedByName: string;
  @ApiProperty({ type: String, nullable: true }) seriesId: string | null;
  @ApiProperty({ enum: TargetMetric }) metric: TargetMetric;
  @ApiProperty({ enum: TargetCadence }) cadence: TargetCadence;
  @ApiProperty() periodStart: string;
  @ApiProperty() periodEnd: string;
  @ApiProperty() dueAt: Date;
  @ApiProperty() assignedAt: Date;
  @ApiProperty() goalAmount: number;
  @ApiProperty() achieved: number;
  @ApiProperty() remaining: number;
  @ApiProperty() dailyPace: number;
  @ApiProperty() percentage: number;
  @ApiProperty() streak: number;
  @ApiProperty({ enum: ["UPCOMING", "ACTIVE", "COMPLETED", "MISSED", "CANCELLED"] }) status: string;
  @ApiProperty({ type: String, format: "date-time", nullable: true }) cancelledAt: Date | null;
  @ApiProperty({ type: [TargetDeliveryDto] }) deliveries: TargetDeliveryDto[];
}
export class TargetSeriesResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() repId: string;
  @ApiProperty() repName: string;
  @ApiProperty() assignedByName: string;
  @ApiProperty({ enum: TargetMetric }) metric: TargetMetric;
  @ApiProperty({ enum: TargetCadence }) cadence: TargetCadence;
  @ApiProperty() goalAmount: number;
  @ApiProperty() nextStart: string;
  @ApiProperty() paused: boolean;
  @ApiProperty({ type: String, format: "date-time" }) createdAt: Date;
}
