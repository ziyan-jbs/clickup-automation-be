import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString } from "class-validator";
export class ReportQuery {
  @ApiPropertyOptional({
    type: String,
    format: "date",
    example: "2026-09-01",
    description: "Inclusive report date, UTC; delivery metrics use completion date",
  })
  @IsOptional()
  @IsDateString()
  from?: string;
  @ApiPropertyOptional({
    type: String,
    format: "date",
    example: "2026-09-30",
    description: "Inclusive report date, UTC; delivery metrics use completion date",
  })
  @IsOptional()
  @IsDateString()
  to?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  repId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;
}
