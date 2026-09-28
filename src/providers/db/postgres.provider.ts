import { config as loadEnv } from "dotenv";
import { DataSource, DataSourceOptions } from "typeorm";

import configuration from "@/config/configuration";
import { AuditLog } from "@/entities/audit-log.entity";
import { AuthSession } from "@/entities/auth-session.entity";
import { AutomationRuleRun } from "@/entities/automation-rule-run.entity";
import { AutomationRule } from "@/entities/automation-rule.entity";
import { ClickUpConnection } from "@/entities/clickup-connection.entity";
import { ClickUpTask } from "@/entities/clickup-task.entity";
import { ClickUpWorkspace } from "@/entities/clickup-workspace.entity";
import { User } from "@/entities/user.entity";
import { UserPreference } from "@/entities/user-preference.entity";

loadEnv({
  path: `.env.${process.env.ENVIRONMENT || "development"}`,
});

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
  logging: env.app.environment === "development" ? ["error", "warn"] : ["error"],
  entities: [
    User,
    AuthSession,
    UserPreference,
    ClickUpConnection,
    ClickUpWorkspace,
    ClickUpTask,
    AutomationRule,
    AutomationRuleRun,
    AuditLog,
  ],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
};

export default new DataSource(postgresDataSourceOptions);
