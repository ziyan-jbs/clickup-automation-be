import { ApiProperty } from "@nestjs/swagger";

export class DashboardResponseDto {
  @ApiProperty({ enum: ["PKR"], example: "PKR" }) currency: string;
  @ApiProperty({
    example:
      "Delivered metrics use delivery completion date; submitted metrics use submission date.",
  })
  dateBasis: string;
  @ApiProperty({ type: "integer", example: 6 }) submittedOrderCount: number;
  @ApiProperty({ type: "integer", example: 1788000 }) submittedValueMinor: number;
  @ApiProperty({ type: "integer", example: 3 }) deliveredOrderCount: number;
  @ApiProperty({ type: "integer", example: 1287000 }) deliveredSalesValueMinor: number;
  @ApiProperty({ type: "integer", example: 3 }) activeShopsServed: number;
}

export class ProductReportItemDto {
  @ApiProperty({ example: "prd_juice" }) productId: string;
  @ApiProperty({ example: "Mango Juice" }) productName: string;
  @ApiProperty({ example: "JUI-001" }) productSku: string;
  @ApiProperty({ type: "integer", example: 4 }) deliveredBoxes: number;
  @ApiProperty({ type: "integer", example: 288000 }) deliveredSalesValueMinor: number;
}

export class ShopReportItemDto {
  @ApiProperty({ example: "shp_example" }) id: string;
  @ApiProperty({ example: "City Super Store" }) name: string;
  @ApiProperty({ example: "Gulshan" }) area: string;
  @ApiProperty({ type: "integer", example: 393000 }) deliveredSalesValueMinor: number;
  @ApiProperty({ type: "integer", example: 1 }) deliveredOrderCount: number;
}

export class RepReportItemDto {
  @ApiProperty({ example: "usr_rep" }) id: string;
  @ApiProperty({ example: "Ali Raza" }) name: string;
  @ApiProperty({ format: "email", example: "rep.ali@demo.test" }) email: string;
  @ApiProperty({ type: "integer", example: 1005000 }) deliveredSalesValueMinor: number;
  @ApiProperty({ type: "integer", example: 2 }) deliveredOrderCount: number;
  @ApiProperty({ type: "integer", example: 2 }) shopsServed: number;
}

export class TrendReportItemDto {
  @ApiProperty({ type: String, format: "date", example: "2026-09-20" }) day: string;
  @ApiProperty({ type: "integer", example: 1 }) deliveredOrderCount: number;
  @ApiProperty({ type: "integer", example: 393000 }) deliveredSalesValueMinor: number;
}

class DeliveredReportResponseDto {
  @ApiProperty({ enum: ["PKR"], example: "PKR" }) currency: string;
  @ApiProperty({ enum: ["delivery completion UTC"], example: "delivery completion UTC" })
  dateBasis: string;
}

export class ProductsReportResponseDto extends DeliveredReportResponseDto {
  @ApiProperty({ type: () => [ProductReportItemDto] }) items: ProductReportItemDto[];
}

export class ShopsReportResponseDto extends DeliveredReportResponseDto {
  @ApiProperty({ type: () => [ShopReportItemDto] }) items: ShopReportItemDto[];
}

export class RepsReportResponseDto extends DeliveredReportResponseDto {
  @ApiProperty({ type: () => [RepReportItemDto] }) items: RepReportItemDto[];
}

export class TrendReportResponseDto extends DeliveredReportResponseDto {
  @ApiProperty({ type: () => [TrendReportItemDto] }) items: TrendReportItemDto[];
}
