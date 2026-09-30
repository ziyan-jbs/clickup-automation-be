import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { OrderStatus } from "@/entities/order.entity";
import { PageQueryDto } from "@/common/dto/page-query.dto";
export class OrderInputLine {
  @ApiProperty({ example: "prd_example" })
  @IsString()
  productId: string;
  @ApiProperty({ type: "integer", example: 6, minimum: 1, maximum: 2147483647 })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  orderedBoxes: number;
}
export class CreateOrderDto {
  @ApiProperty({ example: "shp_example" })
  @IsString()
  shopId: string;
  @ApiProperty({ example: "mobile-order-uuid-123" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  idempotencyKey: string;
  @ApiPropertyOptional({ type: String, nullable: true, example: "Deliver after 3pm" })
  @IsOptional()
  @IsString()
  notes?: string | null;
  @ApiProperty({ type: [OrderInputLine] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderInputLine)
  lines: OrderInputLine[];
}
export class DeliveryLineDto {
  @ApiProperty({ example: "lin_example" })
  @IsString()
  lineId: string;
  @ApiProperty({ type: "integer", example: 4, minimum: 0, maximum: 2147483647 })
  @IsInt()
  @Min(0)
  @Max(2147483647)
  deliveredBoxes: number;
}
export class AcceptLineDto {
  @ApiProperty({ example: "lin_example" })
  @IsString()
  lineId: string;
  @ApiProperty({ type: "integer", example: 4, minimum: 0 })
  @IsInt()
  @Min(0)
  @Max(2147483647)
  acceptedBoxes: number;
}
export class AcceptOrderDto {
  @ApiProperty({ type: [AcceptLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AcceptLineDto)
  lines: AcceptLineDto[];
}
export class DeliverOrderDto {
  @ApiProperty({ type: [DeliveryLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DeliveryLineDto)
  lines: DeliveryLineDto[];
  @ApiPropertyOptional({ type: String, nullable: true, example: "Two boxes short" })
  @IsOptional()
  @IsString()
  note?: string | null;
}
export class CancelOrderDto {
  @ApiProperty({ example: "Shop requested cancellation" })
  @IsString()
  @MinLength(1)
  @Matches(/\S/, { message: "reason must contain non-whitespace text" })
  reason: string;
}
export class OrderQuery extends PageQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  repId?: string;
  @ApiPropertyOptional({
    type: String,
    format: "date",
    example: "2026-09-01",
    description: "Inclusive submission date, UTC",
  })
  @IsOptional()
  @IsDateString()
  from?: string;
  @ApiPropertyOptional({
    type: String,
    format: "date",
    example: "2026-09-30",
    description: "Inclusive submission date, UTC",
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
