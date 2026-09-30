import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSuperAdminRole1790800000002 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`UPDATE "users" SET "role" = 'ADMIN' WHERE "role" = 'SUPER_ADMIN'`);
    await q.query(`CREATE TYPE "user_role_enum_previous" AS ENUM ('ADMIN', 'SALES_REP')`);
    await q.query(`ALTER TABLE "users" ALTER COLUMN "role" TYPE "user_role_enum_previous" USING "role"::text::"user_role_enum_previous"`);
    await q.query(`DROP TYPE "user_role_enum"`);
    await q.query(`ALTER TYPE "user_role_enum_previous" RENAME TO "user_role_enum"`);
  }
}
