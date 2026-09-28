import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

import { AutomationRunStatus } from "@/types/automation.types";

export class ListAuditQuery {
  @IsOptional() @IsString() workspaceId?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(AutomationRunStatus) status?: AutomationRunStatus;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
}
