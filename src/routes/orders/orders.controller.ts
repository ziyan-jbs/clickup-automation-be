import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { UserRole } from "@/entities/user.entity";
import { CurrentUser } from "@/routes/auth/current-user.decorator";
import { AuthenticatedUser } from "@/routes/auth/auth.types";
import { JwtAuthGuard } from "@/routes/auth/jwt-auth.guard";
import { Roles } from "@/routes/auth/roles.decorator";
import { RolesGuard } from "@/routes/auth/roles.guard";
import {
  CancelOrderDto,
  AcceptOrderDto,
  CreateOrderDto,
  DeliverOrderDto,
  OrderQuery,
} from "@/routes/orders/orders.dto";
import { OrdersService } from "@/routes/orders/orders.service";
import { OrderDetailResponseDto, PaginatedOrdersResponseDto } from "@/swagger/api-response.dto";
@ApiTags("Orders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}
  @Get() @ApiOkResponse({ type: PaginatedOrdersResponseDto }) list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: OrderQuery,
  ) {
    return this.orders.list(user, query);
  }
  @Post()
  @Roles(UserRole.SALES_REP)
  @ApiOperation({ summary: "Submit a multi-product order; duplicate product lines are merged" })
  @ApiCreatedResponse({
    type: OrderDetailResponseDto,
    description: "Server-priced order snapshot with lines and status history",
  })
  submit(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateOrderDto) {
    return this.orders.submit(user, body);
  }
  @Get(":id") @ApiOkResponse({ type: OrderDetailResponseDto }) get(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.orders.get(id, user);
  }
  @Patch(":id/accept")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOkResponse({ type: OrderDetailResponseDto })
  accept(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser, @Body() body: AcceptOrderDto) {
    return this.orders.accept(id, user, body);
  }
  @Patch(":id/pickup")
  @ApiOkResponse({ type: OrderDetailResponseDto })
  pickup(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.orders.pickup(id, user);
  }
  @Patch(":id/delivery")
  @Roles(UserRole.SALES_REP)
  @ApiOperation({
    summary: "Finalize all line quantities once; zero delivered requires cancellation",
  })
  @ApiOkResponse({
    type: OrderDetailResponseDto,
    description: "Includes ordered and delivered box quantities and totals",
  })
  deliver(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: DeliverOrderDto,
  ) {
    return this.orders.deliver(id, user, body);
  }
  @Patch(":id/cancel")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOkResponse({ type: OrderDetailResponseDto })
  cancel(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CancelOrderDto,
  ) {
    return this.orders.cancel(id, user, body.reason);
  }
}
