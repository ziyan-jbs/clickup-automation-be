import { MigrationInterface, QueryRunner } from "typeorm";

export class ImplementAutomationApi1781823600000 implements MigrationInterface {
  name = "ImplementAutomationApi1781823600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_clickup_connections_clickup_user" ON "clickup_connections" ("clickupUserId")`);
    await queryRunner.query(`
      CREATE TABLE "auth_sessions" (
        "id" varchar(14) PRIMARY KEY,
        "userId" varchar(14) NOT NULL,
        "refreshTokenHash" varchar(64) NOT NULL,
        "expiresAt" timestamptz NOT NULL,
        "revokedAt" timestamptz,
        "lastUsedAt" timestamptz,
        "ip" varchar(64),
        "userAgent" varchar(255),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_auth_sessions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_auth_sessions_token" ON "auth_sessions" ("refreshTokenHash")`);
    await queryRunner.query(`CREATE INDEX "IDX_auth_sessions_user_expiry" ON "auth_sessions" ("userId", "expiresAt")`);

    await queryRunner.query(`ALTER TABLE "clickup_workspaces" ADD "isAuthorized" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "clickup_tasks" ADD "trackedMinutes" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "clickup_tasks" ADD "isClosed" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "clickup_tasks" ADD "isAvailable" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "clickup_tasks" ADD "lastSyncedAt" timestamptz`);

    await queryRunner.query(`
      CREATE TABLE "user_preferences" (
        "id" varchar(14) PRIMARY KEY,
        "userId" varchar(14) NOT NULL,
        "activeWorkspaceId" varchar(14),
        "timezone" varchar(80) NOT NULL DEFAULT 'Asia/Karachi',
        "runTime" varchar(5) NOT NULL DEFAULT '03:00',
        "defaultDailyMinutes" integer NOT NULL DEFAULT 420,
        "defaultEntryStartTime" varchar(5) NOT NULL DEFAULT '09:00',
        "emailNotifications" boolean NOT NULL DEFAULT true,
        "pushNotifications" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_user_preferences_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_preferences_workspace" FOREIGN KEY ("activeWorkspaceId") REFERENCES "clickup_workspaces"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_user_preferences_user" ON "user_preferences" ("userId")`);

    await queryRunner.query(`ALTER TABLE "automation_rules" ADD "minutesPerDay" integer`);
    await queryRunner.query(`UPDATE "automation_rules" SET "minutesPerDay" = ROUND("hoursPerDay" * 60)`);
    await queryRunner.query(`ALTER TABLE "automation_rules" ALTER COLUMN "minutesPerDay" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "automation_rules" DROP COLUMN "hoursPerDay"`);
    await queryRunner.query(`ALTER TABLE "automation_rules" ADD "deletedAt" timestamptz`);

    await queryRunner.query(`ALTER TABLE "automation_rule_runs" ADD "expectedMinutes" integer`);
    await queryRunner.query(`ALTER TABLE "automation_rule_runs" ADD "existingMinutes" integer`);
    await queryRunner.query(`ALTER TABLE "automation_rule_runs" ADD "addedMinutes" integer`);
    await queryRunner.query(`UPDATE "automation_rule_runs" SET
      "expectedMinutes" = ROUND("expectedHours" * 60),
      "existingMinutes" = CASE WHEN "existingHours" IS NULL THEN NULL ELSE ROUND("existingHours" * 60) END,
      "addedMinutes" = CASE WHEN "addedHours" IS NULL THEN NULL ELSE ROUND("addedHours" * 60) END
    `);
    await queryRunner.query(`ALTER TABLE "automation_rule_runs" ALTER COLUMN "expectedMinutes" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "automation_rule_runs" DROP COLUMN "expectedHours"`);
    await queryRunner.query(`ALTER TABLE "automation_rule_runs" DROP COLUMN "existingHours"`);
    await queryRunner.query(`ALTER TABLE "automation_rule_runs" DROP COLUMN "addedHours"`);

    await queryRunner.query(`CREATE TYPE "automation_run_status_enum_new" AS ENUM ('processing', 'awaiting_approval', 'added', 'skipped', 'failed')`);
    await queryRunner.query(`ALTER TABLE "automation_rule_runs" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "automation_rule_runs" ALTER COLUMN "status" TYPE "automation_run_status_enum_new" USING (CASE WHEN "status"::text = 'pending' THEN 'processing' ELSE "status"::text END)::"automation_run_status_enum_new"`);
    await queryRunner.query(`DROP TYPE "automation_run_status_enum"`);
    await queryRunner.query(`ALTER TYPE "automation_run_status_enum_new" RENAME TO "automation_run_status_enum"`);
    await queryRunner.query(`ALTER TABLE "automation_rule_runs" ALTER COLUMN "status" SET DEFAULT 'processing'`);
    await queryRunner.query(`CREATE TYPE "automation_run_trigger_enum" AS ENUM ('scheduled', 'manual', 'backfill')`);
    await queryRunner.query(`ALTER TABLE "automation_rule_runs" ADD "trigger" "automation_run_trigger_enum" NOT NULL DEFAULT 'scheduled'`);
    await queryRunner.query(`ALTER TABLE "automation_rule_runs" ADD "completedAt" timestamptz`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "automation_rule_runs" DROP COLUMN "completedAt"`);
    await queryRunner.query(`ALTER TABLE "automation_rule_runs" DROP COLUMN "trigger"`);
    await queryRunner.query(`DROP TYPE "automation_run_trigger_enum"`);
    await queryRunner.query(`ALTER TABLE "automation_rule_runs" ADD "expectedHours" numeric(5,2)`);
    await queryRunner.query(`ALTER TABLE "automation_rule_runs" ADD "existingHours" numeric(5,2)`);
    await queryRunner.query(`ALTER TABLE "automation_rule_runs" ADD "addedHours" numeric(5,2)`);
    await queryRunner.query(`UPDATE "automation_rule_runs" SET "expectedHours" = "expectedMinutes" / 60.0, "existingHours" = "existingMinutes" / 60.0, "addedHours" = "addedMinutes" / 60.0`);
    await queryRunner.query(`ALTER TABLE "automation_rule_runs" ALTER COLUMN "expectedHours" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "automation_rule_runs" DROP COLUMN "expectedMinutes"`);
    await queryRunner.query(`ALTER TABLE "automation_rule_runs" DROP COLUMN "existingMinutes"`);
    await queryRunner.query(`ALTER TABLE "automation_rule_runs" DROP COLUMN "addedMinutes"`);
    await queryRunner.query(`CREATE TYPE "automation_run_status_enum_old" AS ENUM ('pending', 'added', 'skipped', 'failed')`);
    await queryRunner.query(`ALTER TABLE "automation_rule_runs" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "automation_rule_runs" ALTER COLUMN "status" TYPE "automation_run_status_enum_old" USING (CASE WHEN "status"::text IN ('processing', 'awaiting_approval') THEN 'pending' ELSE "status"::text END)::"automation_run_status_enum_old"`);
    await queryRunner.query(`DROP TYPE "automation_run_status_enum"`);
    await queryRunner.query(`ALTER TYPE "automation_run_status_enum_old" RENAME TO "automation_run_status_enum"`);
    await queryRunner.query(`ALTER TABLE "automation_rule_runs" ALTER COLUMN "status" SET DEFAULT 'pending'`);
    await queryRunner.query(`ALTER TABLE "automation_rules" ADD "hoursPerDay" numeric(5,2)`);
    await queryRunner.query(`UPDATE "automation_rules" SET "hoursPerDay" = "minutesPerDay" / 60.0`);
    await queryRunner.query(`ALTER TABLE "automation_rules" ALTER COLUMN "hoursPerDay" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "automation_rules" DROP COLUMN "minutesPerDay"`);
    await queryRunner.query(`ALTER TABLE "automation_rules" DROP COLUMN "deletedAt"`);
    await queryRunner.query(`DROP TABLE "user_preferences"`);
    await queryRunner.query(`ALTER TABLE "clickup_tasks" DROP COLUMN "lastSyncedAt"`);
    await queryRunner.query(`ALTER TABLE "clickup_tasks" DROP COLUMN "isAvailable"`);
    await queryRunner.query(`ALTER TABLE "clickup_tasks" DROP COLUMN "isClosed"`);
    await queryRunner.query(`ALTER TABLE "clickup_tasks" DROP COLUMN "trackedMinutes"`);
    await queryRunner.query(`ALTER TABLE "clickup_workspaces" DROP COLUMN "isAuthorized"`);
    await queryRunner.query(`DROP TABLE "auth_sessions"`);
    await queryRunner.query(`DROP INDEX "IDX_clickup_connections_clickup_user"`);
  }
}
