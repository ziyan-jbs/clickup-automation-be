import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import { RedisCacheService } from "@/common/cache/redis-cache.service";

@Injectable()
export class AppService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly redisCacheService: RedisCacheService,
  ) {}

  async health() {
    const services = {
      database: "down",
      redis: "disabled",
    };

    try {
      await this.dataSource.query("SELECT 1");
      services.database = "up";
    } catch {
      services.database = "down";
    }

    if (this.redisCacheService.isEnabled()) {
      services.redis = (await this.redisCacheService.ping()) ? "up" : "down";
    }

    return {
      status: services.database === "up" ? "ok" : "degraded",
      uptimeSec: Math.round(process.uptime()),
      services,
    };
  }
}
