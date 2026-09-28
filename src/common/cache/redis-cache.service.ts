import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";

import { REDIS_CLIENT } from "@/providers/redis/redis.constants";
import { RedisClient } from "@/providers/redis/redis.provider";

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisClient) {}

  isEnabled(): boolean {
    return Boolean(this.redis);
  }

  async ping(): Promise<boolean> {
    if (!this.redis) {
      return false;
    }

    try {
      if (this.redis.status === "end") {
        return false;
      }

      if (this.redis.status === "wait") {
        await this.redis.connect();
      }

      await this.redis.set("health:redis-probe", "1", "EX", 10);
      const value = await this.redis.get("health:redis-probe");

      return value === "1";
    } catch {
      this.redis.disconnect();
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      this.redis.disconnect();
    }
  }
}
