import { ApiProperty } from "@nestjs/swagger";
import { OrderStatus } from "@/entities/order.entity";
import { UserRole } from "@/entities/user.entity";
import { ShopApprovalStatus } from "@/entities/shop.entity";

export class HealthResponseDto {
  @ApiProperty({ example: "ok", enum: ["ok"] }) status: string;
}

export class CurrentUserResponseDto {
  @ApiProperty({ example: "usr_example" }) id: string;
  @ApiProperty({ example: "rep.ali@demo.test", format: "email" }) email: string;
  @ApiProperty({ example: "Ali Raza" }) name: string;
  @ApiProperty({ enum: UserRole, example: UserRole.SALES_REP }) role: UserRole;
  @ApiProperty({ example: true }) isActive: boolean;
  @ApiProperty({ example: true }) requiresShopApproval: boolean;
}

export class UserResponseDto extends CurrentUserResponseDto {
  @ApiProperty({ type: String, format: "date-time", example: "2026-09-28T20:12:59.152Z" })
  createdAt: Date;
  @ApiProperty({ type: String, format: "date-time", example: "2026-09-28T20:12:59.152Z" })
  updatedAt: Date;
}

export class LoginResponseDto {
  @ApiProperty({ description: "JWT access token", example: "eyJhbGciOiJIUzI1NiIs..." })
  accessToken: string;
  @ApiProperty({ enum: ["Bearer"], example: "Bearer" }) tokenType: string;
  @ApiProperty({ type: () => UserResponseDto }) user: UserResponseDto;
}

export class ProductResponseDto {
  @ApiProperty({ example: "prd_example" }) id: string;
  @ApiProperty({ example: "JUI-001" }) sku: string;
  @ApiProperty({ example: "Mango Juice" }) name: string;
  @ApiProperty({ type: String, nullable: true, example: "Beverages" }) category: string | null;
  @ApiProperty({ type: String, nullable: true, example: null }) imageUrl: string | null;
  @ApiProperty({ type: "integer", example: 72000, description: "PKR minor units per box" })
  pricePerBoxMinor: number;
  @ApiProperty({ type: "integer", example: 12 }) unitsPerBox: number;
  @ApiProperty({ type: "integer", example: 100 }) availableBoxes: number;
  @ApiProperty({ example: true }) isActive: boolean;
  @ApiProperty({ type: String, format: "date-time", example: "2026-09-28T20:12:59.238Z" })
  createdAt: Date;
  @ApiProperty({ type: String, format: "date-time", example: "2026-09-28T20:12:59.238Z" })
  updatedAt: Date;
}

export class PaginatedProductsResponseDto {
  @ApiProperty({ type: () => [ProductResponseDto] }) items: ProductResponseDto[];
  @ApiProperty({ type: "integer", example: 10 }) total: number;
  @ApiProperty({ type: "integer", example: 1 }) page: number;
  @ApiProperty({ type: "integer", example: 25 }) limit: number;
}

export class ShopResponseDto {
  @ApiProperty({ example: "shp_example" }) id: string;
  @ApiProperty({ example: "City Super Store" }) name: string;
  @ApiProperty({ type: String, nullable: true, example: "Shop owner" }) contactPerson:
    | string
    | null;
  @ApiProperty({ type: String, nullable: true, example: "0300-0000000" }) phone: string | null;
  @ApiProperty({ type: String, nullable: true, example: "Gulshan, Karachi" }) address:
    | string
    | null;
  @ApiProperty({ example: "Gulshan" }) area: string;
  @ApiProperty({
    type: String,
    nullable: true,
    example: "24.8607000",
    description: "Decimal degrees serialized as a string",
  })
  latitude: string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    example: "67.0011000",
    description: "Decimal degrees serialized as a string",
  })
  longitude: string | null;
  @ApiProperty({ example: true }) isActive: boolean;
  @ApiProperty({ enum: ShopApprovalStatus, example: ShopApprovalStatus.APPROVED }) approvalStatus: ShopApprovalStatus;
  @ApiProperty({ type: String, nullable: true, example: "usr_rep" }) assignedRepId: string | null;
  @ApiProperty({ type: String, format: "date-time", example: "2026-09-28T20:12:59.262Z" })
  createdAt: Date;
  @ApiProperty({ type: String, format: "date-time", example: "2026-09-28T20:12:59.262Z" })
  updatedAt: Date;
}

export class ShopWithRepResponseDto extends ShopResponseDto {
  @ApiProperty({ type: () => UserResponseDto, nullable: true }) assignedRep: UserResponseDto | null;
}

export class OrderBaseResponseDto {
  @ApiProperty({ example: "ord_example" }) id: string;
  @ApiProperty({ example: "SO-20261003-ABC123" }) orderNumber: string;
  @ApiProperty({ example: "shp_example" }) shopId: string;
  @ApiProperty({ example: "usr_rep" }) repId: string;
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PARTIALLY_DELIVERED }) status: OrderStatus;
  @ApiProperty({ enum: ["PKR"], example: "PKR" }) currency: string;
  @ApiProperty({ type: "integer", example: 612000 }) orderedTotalMinor: number;
  @ApiProperty({ type: "integer", example: 468000 }) deliveredTotalMinor: number;
  @ApiProperty({ type: String, nullable: true, example: "Deliver after 3pm" }) notes: string | null;
  @ApiProperty({ example: "mobile-generated-uuid" }) idempotencyKey: string;
  @ApiProperty({ type: String, format: "date-time", example: "2026-10-03T09:00:00.000Z" })
  submittedAt: Date;
  @ApiProperty({
    type: String,
    format: "date-time",
    nullable: true,
    example: "2026-10-03T10:00:00.000Z",
  })
  acceptedAt: Date | null;
  @ApiProperty({ type: String, format: "date-time", nullable: true }) pickedUpAt: Date | null;
  @ApiProperty({
    type: String,
    format: "date-time",
    nullable: true,
    example: "2026-10-03T15:00:00.000Z",
  })
  deliveredAt: Date | null;
  @ApiProperty({ type: String, format: "date-time", example: "2026-10-03T09:00:00.000Z" })
  createdAt: Date;
  @ApiProperty({ type: String, format: "date-time", example: "2026-10-03T15:00:00.000Z" })
  updatedAt: Date;
}

export class OrderLineResponseDto {
  @ApiProperty({ example: "lin_juice" }) id: string;
  @ApiProperty({ example: "ord_example" }) orderId: string;
  @ApiProperty({ example: "prd_juice" }) productId: string;
  @ApiProperty({ type: "integer", example: 6 }) orderedBoxes: number;
  @ApiProperty({ type: "integer", example: 4 }) acceptedBoxes: number;
  @ApiProperty({ type: "integer", example: 4 }) deliveredBoxes: number;
  @ApiProperty({ type: "integer", example: 72000 }) unitPriceMinor: number;
  @ApiProperty({ example: "Mango Juice" }) productName: string;
  @ApiProperty({ example: "JUI-001" }) productSku: string;
  @ApiProperty({ type: "integer", example: 12 }) unitsPerBox: number;
  @ApiProperty({ type: "integer", example: 432000 }) orderedLineTotalMinor: number;
  @ApiProperty({ type: "integer", example: 288000 }) deliveredLineTotalMinor: number;
}

export class OrderStatusEventResponseDto {
  @ApiProperty({ example: "evt_example" }) id: string;
  @ApiProperty({ example: "ord_example" }) orderId: string;
  @ApiProperty({ enum: OrderStatus, nullable: true, example: OrderStatus.ACCEPTED })
  previousStatus: OrderStatus | null;
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PARTIALLY_DELIVERED })
  newStatus: OrderStatus;
  @ApiProperty({ example: "usr_admin" }) actorId: string;
  @ApiProperty({ type: String, nullable: true, example: "Two juice boxes unavailable" })
  reason: string | null;
  @ApiProperty({ type: String, format: "date-time", example: "2026-10-03T15:00:00.000Z" })
  createdAt: Date;
  @ApiProperty({ type: () => UserResponseDto }) actor: UserResponseDto;
}

export class OrderWithRepResponseDto extends OrderBaseResponseDto {
  @ApiProperty({ type: () => UserResponseDto }) rep: UserResponseDto;
}

export class ShopDetailResponseDto extends ShopWithRepResponseDto {
  @ApiProperty({ type: () => [OrderWithRepResponseDto], description: "Up to ten recent orders" })
  recentOrders: OrderWithRepResponseDto[];
}

export class PaginatedShopsResponseDto {
  @ApiProperty({ type: () => [ShopWithRepResponseDto] }) items: ShopWithRepResponseDto[];
  @ApiProperty({ type: "integer", example: 10 }) total: number;
  @ApiProperty({ type: "integer", example: 1 }) page: number;
  @ApiProperty({ type: "integer", example: 25 }) limit: number;
}

export class OrderListItemResponseDto extends OrderBaseResponseDto {
  @ApiProperty({ type: () => ShopResponseDto }) shop: ShopResponseDto;
  @ApiProperty({ type: () => UserResponseDto }) rep: UserResponseDto;
}

export class OrderDetailResponseDto extends OrderListItemResponseDto {
  @ApiProperty({ type: () => [OrderLineResponseDto] }) lines: OrderLineResponseDto[];
  @ApiProperty({ type: () => [OrderStatusEventResponseDto] })
  statusEvents: OrderStatusEventResponseDto[];
}

export class PaginatedOrdersResponseDto {
  @ApiProperty({ type: () => [OrderListItemResponseDto] }) items: OrderListItemResponseDto[];
  @ApiProperty({ type: "integer", example: 6 }) total: number;
  @ApiProperty({ type: "integer", example: 1 }) page: number;
  @ApiProperty({ type: "integer", example: 25 }) limit: number;
}
