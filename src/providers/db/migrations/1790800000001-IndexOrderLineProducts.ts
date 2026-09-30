import { MigrationInterface, QueryRunner } from "typeorm";

export class IndexOrderLineProducts1790800000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX "IDX_order_lines_productId" ON "order_lines" ("productId")',
    );
    await queryRunner.query(
      'ALTER TABLE "order_lines" ADD CONSTRAINT "FK_line_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "order_lines" DROP CONSTRAINT "FK_line_product"');
    await queryRunner.query('DROP INDEX "IDX_order_lines_productId"');
  }
}
