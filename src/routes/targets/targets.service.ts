import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, FindOptionsWhere, In, IsNull, Repository } from "typeorm";
import { SalesTarget } from "@/entities/sales-target.entity";
import { TargetSeries } from "@/entities/target-series.entity";
import { UserRole } from "@/entities/user.entity";
import { AuthenticatedUser } from "@/routes/auth/auth.types";
import { AssignTargetsDto, TargetFiltersDto, UpdateSeriesDto, UpdateTargetDto } from "./targets.dto";
import { completionStreak, deadline, deliveredProgress, Delivery, localDate, nextPeriod, pace, periodStart, startUtc, TargetCadence, TargetMetric } from "./targets.logic";

type DeliveryRow = Delivery & { orderId: string; orderNumber: string; shopName: string };
@Injectable()
export class TargetsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TargetsService.name);
  private recurringTimer?: ReturnType<typeof setInterval>;
  constructor(
    @InjectRepository(SalesTarget) private readonly targets: Repository<SalesTarget>,
    @InjectRepository(TargetSeries) private readonly series: Repository<TargetSeries>,
    private readonly db: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.materialize();
    this.recurringTimer = setInterval(() => {
      void this.materialize().catch(error => this.logger.error("Could not create repeating target periods", error));
    }, 60 * 60 * 1000);
    this.recurringTimer.unref();
  }
  onModuleDestroy(): void { if (this.recurringTimer) clearInterval(this.recurringTimer); }

  private async materialize(now = new Date()): Promise<void> {
    const current = localDate(now);
    const ids = (await this.series.find({ where: { paused: false }, select: { id: true } })).map(s => s.id);
    for (const id of ids) {
      await this.db.transaction(async manager => {
        const series = await manager.getRepository(TargetSeries).findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
        if (!series || series.paused) return;
        const currentStart = periodStart(current, series.cadence);
        let cursor = series.nextStart;
        while (cursor <= currentStart) {
          const existing = await manager.getRepository(SalesTarget).findOneBy({ seriesId: id, periodStart: cursor });
          const occupied = await manager.getRepository(SalesTarget).findOne({ where: { repId: series.repId, metric: series.metric, cadence: series.cadence, periodStart: cursor, cancelledAt: IsNull() } });
          if (!existing && !occupied) await manager.getRepository(SalesTarget).save(manager.getRepository(SalesTarget).create({
            repId: series.repId, assignedById: series.assignedById, seriesId: id, metric: series.metric,
            cadence: series.cadence, periodStart: cursor, goalAmount: series.goalAmount, cancelledAt: null, cancelledById: null,
          }));
          cursor = nextPeriod(cursor, series.cadence);
        }
        if (cursor !== series.nextStart) { series.nextStart = cursor; await manager.getRepository(TargetSeries).save(series); }
      });
    }
  }

  async assign(user: AuthenticatedUser, input: AssignTargetsDto) {
    const repIds = [...new Set(input.repIds)];
    const today = localDate(new Date());
    let start: string;
    try { start = periodStart(input.periodStart, input.cadence); } catch { throw new BadRequestException("Invalid target period date"); }
    if (start < periodStart(today, input.cadence)) throw new BadRequestException("Targets cannot start in a past period");
    const reps: { id: string }[] = await this.db.query('SELECT id FROM users WHERE id = ANY($1::varchar[]) AND role = $2 AND "isActive" = true', [repIds, UserRole.SALES_REP]);
    if (reps.length !== repIds.length) throw new BadRequestException("Select active sales reps only");
    const conflict = await this.targets.findOne({ where: { repId: In(repIds), metric: input.metric, cadence: input.cadence, periodStart: start, cancelledAt: IsNull() } });
    if (conflict) throw new ConflictException("A rep already has this target type and cadence for the period");
    const activeSeries = await this.series.find({ where: { repId: In(repIds), metric: input.metric, cadence: input.cadence, paused: false } });
    for (const series of activeSeries) {
      const first = await this.targets.findOne({ where: { seriesId: series.id }, order: { periodStart: "ASC" } });
      if (input.repeat || first && start >= first.periodStart) throw new ConflictException("A repeating target already covers this type and cadence for a selected rep");
    }
    const created = await this.db.transaction(async manager => {
      const items: SalesTarget[] = [];
      for (const repId of repIds) {
        const series = input.repeat ? await manager.getRepository(TargetSeries).save(manager.getRepository(TargetSeries).create({
          repId, assignedById: user.id, metric: input.metric, cadence: input.cadence, goalAmount: input.goalAmount,
          nextStart: nextPeriod(start, input.cadence), paused: false,
        })) : null;
        items.push(await manager.getRepository(SalesTarget).save(manager.getRepository(SalesTarget).create({
          repId, assignedById: user.id, seriesId: series?.id || null, metric: input.metric, cadence: input.cadence,
          periodStart: start, goalAmount: input.goalAmount, cancelledAt: null, cancelledById: null,
        })));
      }
      return items;
    });
    return Promise.all(created.map(t => this.get(t.id, user)));
  }

  private async deliveries(target: SalesTarget, cutoff: Date): Promise<DeliveryRow[]> {
    return this.db.query(
      `SELECT o.id AS "orderId", o.id, o."orderNumber", o."shopId", s.name AS "shopName", o."deliveredAt", o."deliveredTotalMinor", COALESCE(SUM(l."deliveredBoxes"),0)::int AS "deliveredBoxes"
       FROM orders o JOIN shops s ON s.id=o."shopId" JOIN order_lines l ON l."orderId"=o.id
       WHERE o."repId"=$1 AND o.status IN ('DELIVERED','PARTIALLY_DELIVERED') AND o."deliveredAt">=$2 AND o."deliveredAt"<$3 AND o."deliveredAt"<=$4
       GROUP BY o.id,s.name ORDER BY o."deliveredAt" DESC`,
      [target.repId, startUtc(target.periodStart), startUtc(nextPeriod(target.periodStart, target.cadence)), cutoff],
    );
  }

  private async enriched(target: SalesTarget, now: Date, sharedDeliveries?: Promise<DeliveryRow[]>) {
    const dueAt = deadline(target.periodStart, target.cadence);
    const cutoff = new Date(Math.min(now.getTime(), dueAt.getTime(), target.cancelledAt?.getTime() ?? Infinity));
    const deliveries = (sharedDeliveries ? await sharedDeliveries : await this.deliveries(target, cutoff))
      .filter(d => new Date(d.deliveredAt).getTime() <= cutoff.getTime());
    const achieved = deliveredProgress(deliveries, target.metric, cutoff);
    const { remaining, dailyPace, percentage } = pace(achieved, target.goalAmount, dueAt, now);
    const status = target.cancelledAt ? "CANCELLED" : now < startUtc(target.periodStart) ? "UPCOMING" : achieved >= target.goalAmount ? "COMPLETED" : now > dueAt ? "MISSED" : "ACTIVE";
    return {
      id: target.id, repId: target.repId, repName: target.rep?.name || "", assignedById: target.assignedById,
      assignedByName: target.assignedBy?.name || "", seriesId: target.seriesId, metric: target.metric, cadence: target.cadence,
      periodStart: target.periodStart, periodEnd: new Date(startUtc(nextPeriod(target.periodStart, target.cadence)).getTime() - 86400000).toISOString().slice(0, 10),
      dueAt, assignedAt: target.createdAt, goalAmount: target.goalAmount, achieved, remaining, dailyPace, percentage,
      status, cancelledAt: target.cancelledAt, deliveries: deliveries.map(d => ({ ...d, deliveredTotalMinor: Number(d.deliveredTotalMinor), deliveredBoxes: Number(d.deliveredBoxes) })), streak: 0,
    };
  }

  async list(filters: TargetFiltersDto = {}) {
    await this.materialize();
    const now = new Date();
    const where: FindOptionsWhere<SalesTarget> = {};
    if (filters.repId) where.repId = filters.repId;
    if (filters.metric) where.metric = filters.metric;
    if (filters.cadence) where.cadence = filters.cadence;
    const all = await this.targets.find({ where, relations: { rep: true, assignedBy: true }, order: { periodStart: "DESC", createdAt: "DESC" } });
    const deliveries = new Map<string, Promise<DeliveryRow[]>>();
    const enriched = await Promise.all(all.map(t => {
      const key = `${t.repId}:${t.periodStart}:${t.cadence}`;
      if (!deliveries.has(key)) deliveries.set(key, this.deliveries(t, new Date(Math.min(now.getTime(), deadline(t.periodStart, t.cadence).getTime()))));
      return this.enriched(t, now, deliveries.get(key));
    }));
    const groups = new Map<string, typeof enriched>();
    for (const t of enriched) {
      const key = `${t.repId}:${t.metric}:${t.cadence}`;
      groups.set(key, [...(groups.get(key) || []), t]);
    }
    const today = localDate(now);
    for (const group of groups.values()) {
      const streak = completionStreak(group.map(t => ({ start: t.periodStart, goal: t.goalAmount, achieved: t.achieved, cancelled: t.status === "CANCELLED" })), group[0].cadence, today);
      for (const t of group) t.streak = streak;
    }
    return enriched.filter(t => (
      !filters.scope || filters.scope === "all" ||
      filters.scope === "current" && t.periodStart <= today && t.dueAt >= now && t.status !== "CANCELLED" ||
      filters.scope === "upcoming" && t.periodStart > today && t.status !== "CANCELLED" ||
      filters.scope === "history" && (t.dueAt < now || t.status === "CANCELLED")
    ));
  }

  async get(id: string, user: AuthenticatedUser) {
    const target = await this.targets.findOne({ where: { id }, relations: { rep: true, assignedBy: true } });
    if (!target) throw new NotFoundException("Target not found");
    if (user.role === UserRole.SALES_REP && target.repId !== user.id) throw new ForbiddenException("Target belongs to another rep");
    const all = await this.list({ repId: target.repId, metric: target.metric, cadence: target.cadence });
    return all.find(t => t.id === id)!;
  }

  async listSeries() {
    await this.materialize();
    const series = await this.series.find({ relations: { rep: true, assignedBy: true }, order: { createdAt: "DESC" } });
    return series.map(s => ({ id: s.id, repId: s.repId, repName: s.rep.name, assignedByName: s.assignedBy.name, metric: s.metric, cadence: s.cadence, goalAmount: s.goalAmount, nextStart: s.nextStart, paused: s.paused, createdAt: s.createdAt }));
  }

  async update(id: string, user: AuthenticatedUser, body: UpdateTargetDto) {
    const target = await this.targets.findOneBy({ id });
    if (!target) throw new NotFoundException("Target not found");
    if (body.cancel) {
      if (target.cancelledAt) throw new ConflictException("Target is already cancelled");
      target.cancelledAt = new Date(); target.cancelledById = user.id;
    } else if (body.goalAmount !== undefined) {
      if (startUtc(target.periodStart) <= new Date()) throw new BadRequestException("Current and completed periods are fixed; edit the series for future periods");
      target.goalAmount = body.goalAmount;
    } else throw new BadRequestException("Provide goalAmount or cancel");
    await this.targets.save(target);
    return this.get(id, user);
  }

  async updateSeries(id: string, body: UpdateSeriesDto) {
    await this.materialize();
    const series = await this.series.findOneBy({ id });
    if (!series) throw new NotFoundException("Repeating target not found");
    if (body.goalAmount === undefined && body.paused === undefined) throw new BadRequestException("Provide goalAmount or paused");
    if (body.goalAmount !== undefined) series.goalAmount = body.goalAmount;
    if (body.paused !== undefined) {
      if (series.paused && !body.paused) series.nextStart = periodStart(localDate(new Date()), series.cadence);
      series.paused = body.paused;
    }
    await this.series.save(series);
    return this.list({ repId: series.repId, metric: series.metric, cadence: series.cadence });
  }
}
