import { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

import { REDIS_CLIENT } from "@/providers/redis/redis.constants";

export type RedisClient = Redis | null;

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): RedisClient => {
    const host = configService.get<string>("redis.host");

    if (!host) {
      return null;
    }

    const useTls = configService.get<boolean>("redis.tls");

    const redis = new Redis({
      host,
      port: configService.get<number>("redis.port"),
      username: configService.get<string>("redis.username"),
      password: configService.get<string>("redis.password"),
      db: configService.get<number>("redis.db"),
      tls: useTls ? {} : undefined,
      connectTimeout: 2_000,
      lazyConnect: true,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
    });

    redis.on("error", () => {
      // Errors are surfaced through health checks; keep local Docker logs quiet.
    });

    return redis;
  },
};
