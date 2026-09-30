import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Product } from "@/entities/product.entity";
import { AuthModule } from "@/routes/auth/auth.module";
import { ProductsController } from "@/routes/products/products.controller";
import { ProductsService } from "@/routes/products/products.service";
@Module({
  imports: [TypeOrmModule.forFeature([Product]), AuthModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
