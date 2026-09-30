import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order } from "@/entities/order.entity";
import { Shop } from "@/entities/shop.entity";
import { User } from "@/entities/user.entity";
import { AuthModule } from "@/routes/auth/auth.module";
import { ShopsController } from "@/routes/shops/shops.controller";
import { ShopsService } from "@/routes/shops/shops.service";
@Module({
  imports: [TypeOrmModule.forFeature([Shop, User, Order]), AuthModule],
  controllers: [ShopsController],
  providers: [ShopsService],
  exports: [ShopsService],
})
export class ShopsModule {}
