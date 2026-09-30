import { MigrationInterface, QueryRunner } from "typeorm";
export class CreateFieldSalesSchema1790800000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      `CREATE TYPE "user_role_enum" AS ENUM ('ADMIN','SALES_REP'); CREATE TYPE "order_status_enum" AS ENUM ('SUBMITTED','ACCEPTED','DELIVERED','PARTIALLY_DELIVERED','CANCELLED');`,
    );
    await q.query(
      `CREATE TABLE "users" ("id" varchar(24) PRIMARY KEY,"email" varchar(255) NOT NULL UNIQUE,"name" varchar(160) NOT NULL,"passwordHash" text NOT NULL,"role" "user_role_enum" NOT NULL,"isActive" boolean NOT NULL DEFAULT true,"createdAt" TIMESTAMP NOT NULL DEFAULT now(),"updatedAt" TIMESTAMP NOT NULL DEFAULT now());`,
    );
    await q.query(
      `CREATE TABLE "products" ("id" varchar(24) PRIMARY KEY,"sku" varchar(64) NOT NULL UNIQUE,"name" varchar(160) NOT NULL,"category" varchar(100),"imageUrl" varchar(500),"pricePerBoxMinor" integer NOT NULL,"unitsPerBox" integer NOT NULL,"isActive" boolean NOT NULL DEFAULT true,"createdAt" TIMESTAMP NOT NULL DEFAULT now(),"updatedAt" TIMESTAMP NOT NULL DEFAULT now());`,
    );
    await q.query(
      `CREATE TABLE "shops" ("id" varchar(24) PRIMARY KEY,"name" varchar(180) NOT NULL,"contactPerson" varchar(160),"phone" varchar(50),"address" text,"area" varchar(100) NOT NULL,"latitude" decimal(10,7),"longitude" decimal(10,7),"isActive" boolean NOT NULL DEFAULT true,"assignedRepId" varchar(24),"createdAt" TIMESTAMP NOT NULL DEFAULT now(),"updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "FK_shop_rep" FOREIGN KEY ("assignedRepId") REFERENCES "users"("id") ON DELETE SET NULL); CREATE INDEX "IDX_shops_rep_active" ON "shops"("assignedRepId","isActive");`,
    );
    await q.query(
      `CREATE TABLE "orders" ("id" varchar(24) PRIMARY KEY,"orderNumber" varchar(32) NOT NULL UNIQUE,"shopId" varchar(24) NOT NULL,"repId" varchar(24) NOT NULL,"status" "order_status_enum" NOT NULL DEFAULT 'SUBMITTED',"currency" varchar(3) NOT NULL DEFAULT 'PKR',"orderedTotalMinor" integer NOT NULL,"deliveredTotalMinor" integer NOT NULL DEFAULT 0,"notes" text,"idempotencyKey" varchar(100) NOT NULL UNIQUE,"submittedAt" timestamptz NOT NULL,"acceptedAt" timestamptz,"deliveredAt" timestamptz,"createdAt" TIMESTAMP NOT NULL DEFAULT now(),"updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "FK_order_shop" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE RESTRICT, CONSTRAINT "FK_order_rep" FOREIGN KEY ("repId") REFERENCES "users"("id") ON DELETE RESTRICT); CREATE INDEX "IDX_orders_status_delivered" ON "orders"("status","deliveredAt"); CREATE INDEX "IDX_orders_rep_submitted" ON "orders"("repId","submittedAt"); CREATE INDEX "IDX_orders_shop_submitted" ON "orders"("shopId","submittedAt");`,
    );
    await q.query(
      `CREATE TABLE "order_lines" ("id" varchar(24) PRIMARY KEY,"orderId" varchar(24) NOT NULL,"productId" varchar(24) NOT NULL,"orderedBoxes" integer NOT NULL,"deliveredBoxes" integer NOT NULL DEFAULT 0,"unitPriceMinor" integer NOT NULL,"productName" varchar(160) NOT NULL,"productSku" varchar(64) NOT NULL,"unitsPerBox" integer NOT NULL,"orderedLineTotalMinor" integer NOT NULL,"deliveredLineTotalMinor" integer NOT NULL DEFAULT 0, CONSTRAINT "FK_line_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE); CREATE INDEX "IDX_lines_order" ON "order_lines"("orderId");`,
    );
    await q.query(
      `CREATE TABLE "order_status_events" ("id" varchar(24) PRIMARY KEY,"orderId" varchar(24) NOT NULL,"previousStatus" "order_status_enum","newStatus" "order_status_enum" NOT NULL,"actorId" varchar(24) NOT NULL,"reason" text,"createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "FK_event_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE, CONSTRAINT "FK_event_actor" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT); CREATE INDEX "IDX_events_order" ON "order_status_events"("orderId");`,
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(
      `DROP TABLE "order_status_events"; DROP TABLE "order_lines"; DROP TABLE "orders"; DROP TABLE "shops"; DROP TABLE "products"; DROP TABLE "users"; DROP TYPE "order_status_enum"; DROP TYPE "user_role_enum";`,
    );
  }
}
