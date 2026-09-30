import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
import { PageQueryDto } from "@/common/dto/page-query.dto";
export class ProductDto {
  @ApiProperty({ example: "JUI-001" })
  @IsString()
  @MinLength(1)
  sku: string;
  @ApiProperty({ example: "Mango Juice" })
  @IsString()
  @MinLength(1)
  name: string;
  @ApiPropertyOptional({ type: String, nullable: true, example: "Beverages" })
  @IsOptional()
  @IsString()
  category?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  imageUrl?: string | null;
  @ApiProperty({ type: "integer", example: 72000, description: "PKR minor units per box" })
  @IsInt()
  @Min(0)
  @Max(2147483647)
  pricePerBoxMinor: number;
  @ApiProperty({ type: "integer", example: 12 })
  @IsInt()
  @Min(1)
  unitsPerBox: number;
  @ApiProperty({ type: "integer", example: 100, minimum: 0 })
  @IsInt()
  @Min(0)
  @Max(2147483647)
  availableBoxes: number;
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  sku?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  category?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  imageUrl?: string | null;
  @ApiPropertyOptional({ type: "integer" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  pricePerBoxMinor?: number;
  @ApiPropertyOptional({ type: "integer" })
  @IsOptional()
  @IsInt()
  @Min(1)
  unitsPerBox?: number;
  @ApiPropertyOptional({ type: "integer", minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  availableBoxes?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
export class ProductQuery extends PageQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ type: Boolean })
  @Transform(({ value }) => (value === "true" ? true : value === "false" ? false : value))
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
