import { config as loadEnv } from "dotenv";
import { DataSource, DataSourceOptions } from "typeorm";
import configuration from "@/config/configuration";
import { User } from "@/entities/user.entity";
import { Product } from "@/entities/product.entity";
import { Shop } from "@/entities/shop.entity";
import { Order } from "@/entities/order.entity";
import { OrderLine } from "@/entities/order-line.entity";
import { OrderStatusEvent } from "@/entities/order-status-event.entity";
import { SalesTarget } from "@/entities/sales-target.entity";
import { TargetSeries } from "@/entities/target-series.entity";
loadEnv({ path: `.env.${process.env.ENVIRONMENT || "development"}` });
const env = configuration();
export const postgresDataSourceOptions: DataSourceOptions = {
  type: "postgres",
  host: env.pg.host,
  port: env.pg.port,
  username: env.pg.user,
  password: env.pg.password,
  database: env.pg.db,
  synchronize: false,
  migrationsRun: true,
  logging: ["error", "warn"],
  entities: [User, Product, Shop, Order, OrderLine, OrderStatusEvent, SalesTarget, TargetSeries],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
};
export default new DataSource(postgresDataSourceOptions);
