import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

import { AutomationRuleStatus } from "@/types/automation.types";
import { CreateRuleDto } from "@/routes/automation-rule/dto/create-rule.dto";

export class ListRulesQuery {
  @IsOptional() @IsString() workspaceId?: string;
  @IsOptional() @IsEnum(AutomationRuleStatus) status?: AutomationRuleStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
}

export class TargetDateDto { @IsDateString() targetDate: string; }

export class BackfillRangeDto {
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
}

export class ExecuteBackfillDto { @IsString() previewId: string; }

export class SetRuleStatusDto { @IsEnum(AutomationRuleStatus) status: AutomationRuleStatus; }

export class DraftPreviewDto extends CreateRuleDto { @IsDateString() targetDate: string; }
