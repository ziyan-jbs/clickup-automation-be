import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialClickUpAutomationSchema1781820000000 implements MigrationInterface {
  name = "InitialClickUpAutomationSchema1781820000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "automation_rule_status_enum"
      AS ENUM ('active', 'paused', 'needs_attention')
    `);
    await queryRunner.query(`
      CREATE TYPE "existing_time_behavior_enum"
      AS ENUM ('skip', 'top_up', 'approval')
    `);
    await queryRunner.query(`
      CREATE TYPE "automation_run_status_enum"
      AS ENUM ('pending', 'added', 'skipped', 'failed')
    `);
    await queryRunner.query(`
      CREATE TYPE "audit_outcome_enum"
      AS ENUM ('success', 'failed', 'skipped')
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" varchar(14) PRIMARY KEY,
        "email" varchar(255) NOT NULL,
        "name" varchar(160) NOT NULL,
        "timezone" varchar(80) NOT NULL DEFAULT 'Asia/Karachi',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email")`);

    await queryRunner.query(`
      CREATE TABLE "clickup_connections" (
        "id" varchar(14) PRIMARY KEY,
        "userId" varchar(14) NOT NULL,
        "clickupUserId" varchar(80) NOT NULL,
        "clickupEmail" varchar(255) NOT NULL,
        "encryptedAccessToken" text NOT NULL,
        "encryptedRefreshToken" text,
        "tokenExpiresAt" timestamptz,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_clickup_connections_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_clickup_connections_user_clickup_user"
      ON "clickup_connections" ("userId", "clickupUserId")
    `);

    await queryRunner.query(`
      CREATE TABLE "clickup_workspaces" (
        "id" varchar(14) PRIMARY KEY,
        "connectionId" varchar(14) NOT NULL,
        "clickupWorkspaceId" varchar(80) NOT NULL,
        "name" varchar(255) NOT NULL,
        "timezone" varchar(80) NOT NULL DEFAULT 'Asia/Karachi',
        "lastSyncedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_clickup_workspaces_connection"
          FOREIGN KEY ("connectionId") REFERENCES "clickup_connections"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_clickup_workspaces_connection_workspace"
      ON "clickup_workspaces" ("connectionId", "clickupWorkspaceId")
    `);

    await queryRunner.query(`
      CREATE TABLE "clickup_tasks" (
        "id" varchar(14) PRIMARY KEY,
        "workspaceId" varchar(14) NOT NULL,
        "clickupTaskId" varchar(80) NOT NULL,
        "name" varchar(255) NOT NULL,
        "status" varchar(80) NOT NULL,
        "listName" varchar(160),
        "spaceName" varchar(160),
        "assigneeClickupUserId" varchar(80) NOT NULL,
        "dueAt" timestamptz,
        "clickupUpdatedAt" timestamptz,
        "url" varchar(500) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_clickup_tasks_workspace"
          FOREIGN KEY ("workspaceId") REFERENCES "clickup_workspaces"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_clickup_tasks_workspace_task"
      ON "clickup_tasks" ("workspaceId", "clickupTaskId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_clickup_tasks_assignee_status"
      ON "clickup_tasks" ("assigneeClickupUserId", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE "automation_rules" (
        "id" varchar(14) PRIMARY KEY,
        "userId" varchar(14) NOT NULL,
        "taskId" varchar(14) NOT NULL,
        "name" varchar(160) NOT NULL,
        "hoursPerDay" numeric(5,2) NOT NULL,
        "daysOfWeek" varchar array NOT NULL,
        "startDate" date NOT NULL,
        "endDate" date,
        "skipWeekends" boolean NOT NULL DEFAULT true,
        "skipPublicHolidays" boolean NOT NULL DEFAULT false,
        "existingTimeBehavior" "existing_time_behavior_enum" NOT NULL DEFAULT 'skip',
        "status" "automation_rule_status_enum" NOT NULL DEFAULT 'active',
        "timeEntryDescription" varchar(500),
        "auditNote" text,
        "lastRunAt" timestamptz,
        "nextRunAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_automation_rules_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_automation_rules_task"
          FOREIGN KEY ("taskId") REFERENCES "clickup_tasks"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_automation_rules_user_status" ON "automation_rules" ("userId", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_automation_rules_task_status" ON "automation_rules" ("taskId", "status")`);

    await queryRunner.query(`
      CREATE TABLE "automation_rule_runs" (
        "id" varchar(14) PRIMARY KEY,
        "ruleId" varchar(14) NOT NULL,
        "userId" varchar(14) NOT NULL,
        "taskId" varchar(14) NOT NULL,
        "targetDate" date NOT NULL,
        "expectedHours" numeric(5,2) NOT NULL,
        "existingHours" numeric(5,2),
        "addedHours" numeric(5,2),
        "clickupTimeEntryId" varchar(120),
        "status" "automation_run_status_enum" NOT NULL DEFAULT 'pending',
        "errorMessage" text,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_automation_rule_runs_rule"
          FOREIGN KEY ("ruleId") REFERENCES "automation_rules"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_automation_rule_runs_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_automation_rule_runs_task"
          FOREIGN KEY ("taskId") REFERENCES "clickup_tasks"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_automation_rule_runs_unique_day"
      ON "automation_rule_runs" ("userId", "taskId", "ruleId", "targetDate")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_automation_rule_runs_status_created"
      ON "automation_rule_runs" ("status", "createdAt")
    `);

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" varchar(14) PRIMARY KEY,
        "action" varchar(120) NOT NULL,
        "targetType" varchar(80),
        "targetId" varchar(80),
        "userId" varchar(14),
        "requestId" varchar(64),
        "ip" varchar(64),
        "userAgent" varchar(255),
        "outcome" "audit_outcome_enum" NOT NULL DEFAULT 'success',
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_user_created" ON "audit_logs" ("userId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_action_created" ON "audit_logs" ("action", "createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_target" ON "audit_logs" ("targetType", "targetId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TABLE "automation_rule_runs"`);
    await queryRunner.query(`DROP TABLE "automation_rules"`);
    await queryRunner.query(`DROP TABLE "clickup_tasks"`);
    await queryRunner.query(`DROP TABLE "clickup_workspaces"`);
    await queryRunner.query(`DROP TABLE "clickup_connections"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "audit_outcome_enum"`);
    await queryRunner.query(`DROP TYPE "automation_run_status_enum"`);
    await queryRunner.query(`DROP TYPE "existing_time_behavior_enum"`);
    await queryRunner.query(`DROP TYPE "automation_rule_status_enum"`);
  }
}
