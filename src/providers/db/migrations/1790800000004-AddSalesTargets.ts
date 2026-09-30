import { MigrationInterface, QueryRunner } from "typeorm";
export class AddSalesTargets1790800000004 implements MigrationInterface {
  name = "AddSalesTargets1790800000004";
  public async up(q: QueryRunner): Promise<void> {
    await q.query("CREATE TYPE target_metric_enum AS ENUM ('SALES_VALUE','DELIVERED_BOXES','SHOPS_SERVED')");
    await q.query("CREATE TYPE target_cadence_enum AS ENUM ('WEEKLY','MONTHLY')");
    await q.query(`CREATE TABLE "target_series" (
      "id" varchar(24) PRIMARY KEY, "repId" varchar(24) NOT NULL REFERENCES users(id),
      "assignedById" varchar(24) NOT NULL REFERENCES users(id),
      "metric" target_metric_enum NOT NULL, "cadence" target_cadence_enum NOT NULL,
      "goalAmount" integer NOT NULL CHECK ("goalAmount">0), "nextStart" date NOT NULL,
      "paused" boolean NOT NULL DEFAULT false,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE TABLE "sales_targets" (
      "id" varchar(24) PRIMARY KEY, "repId" varchar(24) NOT NULL REFERENCES users(id),
      "assignedById" varchar(24) NOT NULL REFERENCES users(id),
      "seriesId" varchar(24) REFERENCES target_series(id) ON DELETE SET NULL,
      "metric" target_metric_enum NOT NULL, "cadence" target_cadence_enum NOT NULL,
      "periodStart" date NOT NULL, "goalAmount" integer NOT NULL CHECK ("goalAmount">0),
      "cancelledAt" timestamptz, "cancelledById" varchar(24) REFERENCES users(id),
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query('CREATE INDEX "IDX_sales_targets_rep_period" ON sales_targets ("repId","metric","cadence","periodStart")');
    await q.query('CREATE UNIQUE INDEX "UQ_sales_targets_active" ON sales_targets ("repId","metric","cadence","periodStart") WHERE "cancelledAt" IS NULL');
    await q.query('CREATE UNIQUE INDEX "UQ_sales_targets_series_period" ON sales_targets ("seriesId","periodStart") WHERE "seriesId" IS NOT NULL');
    await q.query('CREATE INDEX "IDX_target_series_due" ON target_series ("paused","nextStart")');
  }
  public async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE "sales_targets"');
    await q.query('DROP TABLE "target_series"');
    await q.query("DROP TYPE target_cadence_enum");
    await q.query("DROP TYPE target_metric_enum");
  }
}
