import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AppController } from "@/app.controller";
import { AppService } from "@/app.service";
import { CacheModule } from "@/common/cache/cache.module";
import { SecurityModule } from "@/common/security/security.module";
import { AllExceptionsFilter } from "@/common/filters/all-exceptions.filter";
import { RequestIdMiddleware } from "@/common/middleware/request-id.middleware";
import configuration, { validateEnvironment } from "@/config/configuration";
import { TimeEntrySyncJobModule } from "@/jobs/time-entry-sync/time-entry-sync-job.module";
import { postgresDataSourceOptions } from "@/providers/db/postgres.provider";
import { ClickUpApiModule } from "@/providers/clickup/clickup-api.module";
import { RedisModule } from "@/providers/redis/redis.module";
import { AuditModule } from "@/routes/audit/audit.module";
import { AuthModule } from "@/routes/auth/auth.module";
import { AutomationRuleModule } from "@/routes/automation-rule/automation-rule.module";
import { ClickUpModule } from "@/routes/clickup/clickup.module";
import { DashboardModule } from "@/routes/dashboard/dashboard.module";
import { JobTriggerModule } from "@/routes/job-trigger/job-trigger.module";
import { TaskModule } from "@/routes/task/task.module";
import { SettingsModule } from "@/routes/settings/settings.module";

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
    ScheduleModule.forRoot(),
    RedisModule,
    CacheModule,
    SecurityModule,
    ClickUpApiModule,
    AuthModule,
    ClickUpModule,
    DashboardModule,
    TaskModule,
    AutomationRuleModule,
    AuditModule,
    JobTriggerModule,
    SettingsModule,
    TimeEntrySyncJobModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes({ path: "*path", method: RequestMethod.ALL });
  }
}
