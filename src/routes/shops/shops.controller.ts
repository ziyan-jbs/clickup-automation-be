import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Shop } from "@/entities/shop.entity";
import { UserRole } from "@/entities/user.entity";
import { CurrentUser } from "@/routes/auth/current-user.decorator";
import { AuthenticatedUser } from "@/routes/auth/auth.types";
import { JwtAuthGuard } from "@/routes/auth/jwt-auth.guard";
import { Roles } from "@/routes/auth/roles.decorator";
import { RolesGuard } from "@/routes/auth/roles.guard";
import { AssignmentDto, ReviewShopDto, ShopDto, ShopQuery, UpdateShopDto } from "@/routes/shops/shops.dto";
import { ShopsService } from "@/routes/shops/shops.service";
import {
  PaginatedShopsResponseDto,
  ShopDetailResponseDto,
  ShopResponseDto,
} from "@/swagger/api-response.dto";
@ApiTags("Shops")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("shops")
export class ShopsController {
  constructor(private readonly shops: ShopsService) {}
  @Get() @ApiOkResponse({ type: PaginatedShopsResponseDto }) list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ShopQuery,
  ) {
    return this.shops.list(user.role === UserRole.SALES_REP ? user.id : undefined, query);
  }
  @Get(":id") @ApiOkResponse({ type: ShopDetailResponseDto }) get(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.shops.get(id, user.role === UserRole.SALES_REP ? user.id : undefined);
  }
  @Post() @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN) @ApiCreatedResponse({ type: ShopResponseDto }) create(
    @Body() body: ShopDto,
  ) {
    return this.shops.create(body as Partial<Shop>);
  }
  @Post("requests") @Roles(UserRole.SALES_REP) @ApiCreatedResponse({ type: ShopResponseDto }) request(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ShopDto,
  ) {
    return this.shops.request(user.id, body as Partial<Shop>);
  }
  @Patch(":id/approval") @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN) @ApiOkResponse({ type: ShopResponseDto }) review(
    @Param("id") id: string,
    @Body() body: ReviewShopDto,
  ) {
    return this.shops.review(id, body.approvalStatus);
  }
  @Patch(":id") @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN) @ApiOkResponse({ type: ShopResponseDto }) update(
    @Param("id") id: string,
    @Body() body: UpdateShopDto,
  ) {
    return this.shops.update(id, body as Partial<Shop>);
  }
  @Patch(":id/assignment") @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN) @ApiOkResponse({ type: ShopResponseDto }) assign(
    @Param("id") id: string,
    @Body() body: AssignmentDto,
  ) {
    return this.shops.update(id, body);
  }
}
