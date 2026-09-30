import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PageQueryDto } from "@/common/dto/page-query.dto";
import { IsEnum } from "class-validator";
import { ShopApprovalStatus } from "@/entities/shop.entity";
export class ShopQuery extends PageQueryDto {
  @ApiPropertyOptional({ enum: ShopApprovalStatus })
  @IsOptional()
  @IsEnum(ShopApprovalStatus)
  approvalStatus?: ShopApprovalStatus;
}
export class ReviewShopDto {
  @ApiProperty({ enum: [ShopApprovalStatus.APPROVED, ShopApprovalStatus.REJECTED] })
  @IsEnum(ShopApprovalStatus)
  approvalStatus: ShopApprovalStatus.APPROVED | ShopApprovalStatus.REJECTED;
}
export class ShopDto {
  @ApiProperty({ example: "City Super Store" })
  @IsString()
  @MinLength(1)
  name: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  contactPerson?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  phone?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  address?: string | null;
  @ApiProperty({ example: "Gulshan" })
  @IsString()
  area: string;
  @ApiPropertyOptional({
    oneOf: [
      { type: "string", example: "24.8607" },
      { type: "number", example: 24.8607 },
    ],
    nullable: true,
  })
  @IsOptional()
  @IsLatitude()
  latitude?: string | number | null;
  @ApiPropertyOptional({
    oneOf: [
      { type: "string", example: "67.0011" },
      { type: "number", example: 67.0011 },
    ],
    nullable: true,
  })
  @IsOptional()
  @IsLongitude()
  longitude?: string | number | null;
  @ApiPropertyOptional({ type: String, nullable: true, example: "usr_rep" })
  @IsOptional()
  @IsString()
  assignedRepId?: string | null;
}
export class UpdateShopDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  contactPerson?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  phone?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  address?: string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  area?: string;
  @ApiPropertyOptional({
    oneOf: [
      { type: "string", example: "24.8607" },
      { type: "number", example: 24.8607 },
    ],
    nullable: true,
  })
  @IsOptional()
  @IsLatitude()
  latitude?: string | number | null;
  @ApiPropertyOptional({
    oneOf: [
      { type: "string", example: "67.0011" },
      { type: "number", example: 67.0011 },
    ],
    nullable: true,
  })
  @IsOptional()
  @IsLongitude()
  longitude?: string | number | null;
  @ApiPropertyOptional({ type: String, nullable: true, example: "usr_rep" })
  @IsOptional()
  @IsString()
  assignedRepId?: string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
export class AssignmentDto {
  @ApiProperty({ example: "usr_rep" })
  @IsString()
  assignedRepId: string;
}
