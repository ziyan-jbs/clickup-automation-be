import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPasswordAuthentication1781827200000 implements MigrationInterface {
  name = "AddPasswordAuthentication1781827200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "passwordHash" text`);
    await queryRunner.query(`ALTER TABLE "clickup_connections" ALTER COLUMN "encryptedAccessToken" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "clickup_connections" WHERE "encryptedAccessToken" IS NULL`);
    await queryRunner.query(`ALTER TABLE "clickup_connections" ALTER COLUMN "encryptedAccessToken" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "passwordHash"`);
  }
}
