import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, Min } from "class-validator";

export class UpdateSettingsDto {
  @IsOptional() @IsString() activeWorkspaceId?: string | null;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) runTime?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1440) defaultDailyMinutes?: number;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) defaultEntryStartTime?: string;
  @IsOptional() @IsBoolean() emailNotifications?: boolean;
  @IsOptional() @IsBoolean() pushNotifications?: boolean;
}
