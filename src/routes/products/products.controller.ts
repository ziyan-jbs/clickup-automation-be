import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@/entities/user.entity";
import { CurrentUser } from "@/routes/auth/current-user.decorator";
import { AuthenticatedUser } from "@/routes/auth/auth.types";
import { JwtAuthGuard } from "@/routes/auth/jwt-auth.guard";
import { RolesGuard } from "@/routes/auth/roles.guard";
import { Roles } from "@/routes/auth/roles.decorator";
import { ProductDto, ProductQuery, UpdateProductDto } from "@/routes/products/products.dto";
import { ProductsService } from "@/routes/products/products.service";
import { PaginatedProductsResponseDto, ProductResponseDto } from "@/swagger/api-response.dto";
@ApiTags("Products")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("products")
export class ProductsController {
  constructor(private readonly products: ProductsService) {}
  @Get() @ApiOkResponse({ type: PaginatedProductsResponseDto }) list(
    @Query() query: ProductQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.products.list(query, user.role === UserRole.SALES_REP);
  }
  @Get(":id") @ApiOkResponse({ type: ProductResponseDto }) get(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.products.get(id, user.role === UserRole.SALES_REP);
  }
  @Post() @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN) @ApiCreatedResponse({ type: ProductResponseDto }) create(
    @Body() body: ProductDto,
  ) {
    return this.products.create(body);
  }
  @Patch(":id") @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN) @ApiOkResponse({ type: ProductResponseDto }) update(
    @Param("id") id: string,
    @Body() body: UpdateProductDto,
  ) {
    return this.products.update(id, body);
  }
}
