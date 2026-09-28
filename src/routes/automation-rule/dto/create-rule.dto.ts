import { Type } from "class-transformer";
import {
  ArrayMinSize,
  Equals,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

import { DAY_KEYS } from "@/common/date-time/date-time.helper";
import { ExistingTimeBehavior } from "@/types/automation.types";

export class CreateRuleDto {
  @IsString() taskId: string;
  @IsString() @MaxLength(160) name: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(1440) minutesPerDay: number;
  @IsArray() @ArrayMinSize(1) @IsIn(DAY_KEYS, { each: true }) daysOfWeek: string[];
  @IsDateString() startDate: string;
  @IsOptional() @IsDateString() endDate?: string | null;
  @IsOptional() @IsBoolean() skipWeekends = true;
  @IsOptional() @Equals(false, { message: "Public-holiday skipping is not available in v1" }) skipPublicHolidays = false;
  @IsEnum(ExistingTimeBehavior) existingTimeBehavior: ExistingTimeBehavior;
  @IsOptional() @IsString() @MaxLength(500) timeEntryDescription?: string | null;
  @IsOptional() @IsString() auditNote?: string | null;
}
