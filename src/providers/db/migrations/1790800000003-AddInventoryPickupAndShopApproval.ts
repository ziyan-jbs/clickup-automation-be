import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInventoryPickupAndShopApproval1790800000003 implements MigrationInterface {
  name = "AddInventoryPickupAndShopApproval1790800000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "products" ADD "availableBoxes" integer NOT NULL DEFAULT 0');
    await queryRunner.query('ALTER TABLE "order_lines" ADD "acceptedBoxes" integer NOT NULL DEFAULT 0');
    await queryRunner.query('ALTER TABLE "orders" ADD "pickedUpAt" TIMESTAMP WITH TIME ZONE');
    await queryRunner.query('ALTER TABLE "users" ADD "requiresShopApproval" boolean NOT NULL DEFAULT true');
    await queryRunner.query("CREATE TYPE \"shops_approvalstatus_enum\" AS ENUM('APPROVED', 'PENDING', 'REJECTED')");
    await queryRunner.query('ALTER TABLE "shops" ADD "approvalStatus" "shops_approvalstatus_enum" NOT NULL DEFAULT \'APPROVED\'');
    await queryRunner.query("ALTER TYPE \"order_status_enum\" ADD VALUE IF NOT EXISTS 'PICKED_UP'");
    await queryRunner.query('UPDATE "order_lines" SET "acceptedBoxes" = "orderedBoxes" WHERE "orderId" IN (SELECT id FROM "orders" WHERE status IN (\'ACCEPTED\', \'DELIVERED\', \'PARTIALLY_DELIVERED\'))');
    await queryRunner.query('UPDATE "orders" SET "pickedUpAt" = "deliveredAt" WHERE status IN (\'DELIVERED\', \'PARTIALLY_DELIVERED\')');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "shops" DROP COLUMN "approvalStatus"');
    await queryRunner.query('DROP TYPE "shops_approvalstatus_enum"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "requiresShopApproval"');
    await queryRunner.query('ALTER TABLE "orders" DROP COLUMN "pickedUpAt"');
    await queryRunner.query('ALTER TABLE "order_lines" DROP COLUMN "acceptedBoxes"');
    await queryRunner.query('ALTER TABLE "products" DROP COLUMN "availableBoxes"');
    // PostgreSQL enum values cannot be removed without recreating the type.
  }
}
