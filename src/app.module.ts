import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import configuration, { validateEnvironment } from "@/config/configuration";
import { postgresDataSourceOptions } from "@/providers/db/postgres.provider";
import { AllExceptionsFilter } from "@/common/filters/all-exceptions.filter";
import { RequestIdMiddleware } from "@/common/middleware/request-id.middleware";
import { AppController } from "@/app.controller";
import { AuthModule } from "@/routes/auth/auth.module";
import { UsersModule } from "@/routes/users/users.module";
import { ProductsModule } from "@/routes/products/products.module";
import { ShopsModule } from "@/routes/shops/shops.module";
import { OrdersModule } from "@/routes/orders/orders.module";
import { ReportsModule } from "@/routes/reports/reports.module";
import { TargetsModule } from "@/routes/targets/targets.module";
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.ENVIRONMENT || "development"}`,
      load: [configuration],
      validate: validateEnvironment,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: () => postgresDataSourceOptions,
    }),
    AuthModule,
    UsersModule,
    ProductsModule,
    ShopsModule,
    OrdersModule,
    ReportsModule,
    TargetsModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes({ path: "*path", method: RequestMethod.ALL });
  }
}
