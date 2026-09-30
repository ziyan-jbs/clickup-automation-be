import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { ReportQuery } from "@/routes/reports/reports.dto";
@Injectable()
export class ReportsService {
  constructor(private readonly db: DataSource) {}
  private values(q: ReportQuery) {
    return [q.from || "2000-01-01", q.to || "2100-01-01", q.repId || null, q.shopId || null];
  }
  private delivered(alias = "o") {
    return `${alias}."deliveredAt" >= $1::date AND ${alias}."deliveredAt" < ($2::date + interval '1 day') AND ($3::varchar IS NULL OR ${alias}."repId" = $3) AND ($4::varchar IS NULL OR ${alias}."shopId" = $4)`;
  }
  async dashboard(q: ReportQuery) {
    const [r] = await this.db.query(
      `SELECT COUNT(*) FILTER (WHERE "submittedAt">=$1::date AND "submittedAt"<($2::date + interval '1 day'))::int AS "submittedOrderCount",COALESCE(SUM("orderedTotalMinor") FILTER (WHERE "submittedAt">=$1::date AND "submittedAt"<($2::date + interval '1 day')),0)::int AS "submittedValueMinor",COUNT(*) FILTER (WHERE status IN ('DELIVERED','PARTIALLY_DELIVERED') AND "deliveredAt">=$1::date AND "deliveredAt"<($2::date + interval '1 day'))::int AS "deliveredOrderCount",COALESCE(SUM("deliveredTotalMinor") FILTER (WHERE status IN ('DELIVERED','PARTIALLY_DELIVERED') AND "deliveredAt">=$1::date AND "deliveredAt"<($2::date + interval '1 day')),0)::int AS "deliveredSalesValueMinor",COUNT(DISTINCT "shopId") FILTER (WHERE status IN ('DELIVERED','PARTIALLY_DELIVERED') AND "deliveredAt">=$1::date AND "deliveredAt"<($2::date + interval '1 day'))::int AS "activeShopsServed" FROM orders WHERE ($3::varchar IS NULL OR "repId"=$3) AND ($4::varchar IS NULL OR "shopId"=$4)`,
      this.values(q),
    );
    return {
      currency: "PKR",
      dateBasis:
        "Delivered metrics use delivery completion date; submitted metrics use submission date.",
      ...r,
    };
  }
  async topProducts(q: ReportQuery) {
    const items = await this.db.query(
      `SELECT l."productId",MAX(l."productName") AS "productName",MAX(l."productSku") AS "productSku",SUM(l."deliveredBoxes")::int AS "deliveredBoxes",SUM(l."deliveredLineTotalMinor")::int AS "deliveredSalesValueMinor" FROM order_lines l JOIN orders o ON o.id=l."orderId" WHERE o.status IN ('DELIVERED','PARTIALLY_DELIVERED') AND ${this.delivered()} GROUP BY l."productId" ORDER BY "deliveredSalesValueMinor" DESC`,
      this.values(q),
    );
    return { currency: "PKR", dateBasis: "delivery completion UTC", items };
  }
  async shops(q: ReportQuery) {
    const items = await this.db.query(
      `SELECT s.id,s.name,s.area,SUM(o."deliveredTotalMinor")::int AS "deliveredSalesValueMinor",COUNT(o.id)::int AS "deliveredOrderCount" FROM shops s JOIN orders o ON o."shopId"=s.id AND o.status IN ('DELIVERED','PARTIALLY_DELIVERED') WHERE ${this.delivered()} GROUP BY s.id,s.name,s.area ORDER BY "deliveredSalesValueMinor" DESC`,
      this.values(q),
    );
    return { currency: "PKR", dateBasis: "delivery completion UTC", items };
  }
  shopBreakdown(id: string, q: ReportQuery) {
    return this.topProducts({ ...q, shopId: id });
  }
  async reps(q: ReportQuery) {
    const items = await this.db.query(
      `SELECT u.id,u.name,u.email,SUM(o."deliveredTotalMinor")::int AS "deliveredSalesValueMinor",COUNT(o.id)::int AS "deliveredOrderCount",COUNT(DISTINCT o."shopId")::int AS "shopsServed" FROM users u JOIN orders o ON o."repId"=u.id AND o.status IN ('DELIVERED','PARTIALLY_DELIVERED') WHERE ${this.delivered()} GROUP BY u.id,u.name,u.email ORDER BY "deliveredSalesValueMinor" DESC`,
      this.values(q),
    );
    return { currency: "PKR", dateBasis: "delivery completion UTC", items };
  }
  async trend(q: ReportQuery) {
    const items = await this.db.query(
      `SELECT to_char(o."deliveredAt" AT TIME ZONE 'UTC','YYYY-MM-DD') AS day,COUNT(*)::int AS "deliveredOrderCount",SUM(o."deliveredTotalMinor")::int AS "deliveredSalesValueMinor" FROM orders o WHERE o.status IN ('DELIVERED','PARTIALLY_DELIVERED') AND ${this.delivered()} GROUP BY day ORDER BY day`,
      this.values(q),
    );
    return { currency: "PKR", dateBasis: "delivery completion UTC", items };
  }
}
