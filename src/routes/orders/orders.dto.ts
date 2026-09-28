import { Type } from "class-transformer"; import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from "class-validator"; import { OrderStatus } from "@/entities/order.entity";
export class OrderInputLine { @IsString() productId: string; @IsInt() @Min(1) orderedBoxes: number; }
export class CreateOrderDto { @IsString() shopId: string; @IsString() idempotencyKey: string; @IsOptional() @IsString() notes?: string; @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => OrderInputLine) lines: OrderInputLine[]; }
export class DeliveryLineDto { @IsString() lineId: string; @IsInt() @Min(0) deliveredBoxes: number; }
export class DeliverOrderDto { @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => DeliveryLineDto) lines: DeliveryLineDto[]; @IsOptional() @IsString() note?: string; }
export class CancelOrderDto { @IsString() reason: string; }
export class OrderQuery { @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus; @IsOptional() @IsString() shopId?: string; @IsOptional() @IsString() repId?: string; @IsOptional() @IsDateString() from?: string; @IsOptional() @IsDateString() to?: string; }
