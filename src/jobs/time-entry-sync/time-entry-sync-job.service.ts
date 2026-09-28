import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import { AutomationRuleService } from "@/routes/automation-rule/automation-rule.service";

@Injectable()
export class TimeEntrySyncJobService {
  constructor(
    private readonly configService: ConfigService,
    private readonly automationRuleService: AutomationRuleService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Cron(process.env.TIME_ENTRY_SYNC_CRON || "0 */5 * * * *", { name: "time-entry-sync" })
  async runScheduledSync(): Promise<{ processed: number; skipped?: string }> {
    if (this.configService.get<boolean>("cron.disabled")) return { processed: 0, skipped: "disabled" };
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const [{ locked }] = (await queryRunner.query(
        "SELECT pg_try_advisory_lock(hashtext($1)) AS locked",
        ["clickup-automation:time-entry-sync"],
      )) as Array<{ locked: boolean }>;
      if (!locked) return { processed: 0, skipped: "already_running" };
      try {
        return await this.automationRuleService.executeDueRules();
      } finally {
        await queryRunner.query("SELECT pg_advisory_unlock(hashtext($1))", ["clickup-automation:time-entry-sync"]);
      }
    } finally {
      await queryRunner.release();
    }
  }
}
