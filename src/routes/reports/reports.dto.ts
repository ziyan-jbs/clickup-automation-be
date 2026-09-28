import { IsDateString, IsOptional, IsString } from "class-validator";
export class ReportQuery { @IsOptional() @IsDateString() from?: string; @IsOptional() @IsDateString() to?: string; @IsOptional() @IsString() repId?: string; @IsOptional() @IsString() shopId?: string; }
