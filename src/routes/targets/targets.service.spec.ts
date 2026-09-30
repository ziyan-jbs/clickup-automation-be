import { ForbiddenException } from "@nestjs/common";
import { UserRole } from "@/entities/user.entity";
import { ROLES_KEY } from "@/routes/auth/roles.decorator";
import { TargetsController } from "./targets.controller";
import { TargetCadence, TargetMetric } from "./targets.logic";
import { TargetsService } from "./targets.service";

describe("TargetsService", () => {
  it("limits assignment to admins and self-listing to sales reps", () => {
    expect(Reflect.getMetadata(ROLES_KEY, TargetsController.prototype.assign)).toEqual([UserRole.SUPER_ADMIN, UserRole.ADMIN]);
    expect(Reflect.getMetadata(ROLES_KEY, TargetsController.prototype.mine)).toEqual([UserRole.SALES_REP]);
    expect(Reflect.getMetadata(ROLES_KEY, TargetsController.prototype.team)).toEqual([UserRole.SUPER_ADMIN, UserRole.ADMIN]);
    expect(Reflect.getMetadata(ROLES_KEY, TargetsController.prototype.updateSeries)).toEqual([UserRole.SUPER_ADMIN, UserRole.ADMIN]);
  });
  it("keeps another rep's target private", async () => {
    const targetRepo = { findOne: jest.fn().mockResolvedValue({ id: "tgt_1", repId: "rep_1" }) };
    const service = new TargetsService(targetRepo as never, {} as never, {} as never);
    await expect(service.get("tgt_1", { id: "rep_2", role: UserRole.SALES_REP } as never)).rejects.toThrow(ForbiddenException);
    expect(targetRepo.findOne).toHaveBeenCalledTimes(1);
  });

  it("reads only final deliveries inside the Karachi period", async () => {
    const query = jest.fn().mockResolvedValue([]);
    const service = new TargetsService({} as never, {} as never, { query } as never);
    await service["deliveries"]({ repId: "rep_1", periodStart: "2026-09-28", cadence: TargetCadence.WEEKLY } as never, new Date("2026-09-30T00:00:00Z"));
    const [sql, args] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("'DELIVERED','PARTIALLY_DELIVERED'");
    expect(sql).toContain('o."deliveredAt"<=$4');
    expect(args[1]).toEqual(new Date("2026-09-27T19:00:00Z"));
    expect(args[2]).toEqual(new Date("2026-10-04T19:00:00Z"));
  });

  it("creates every missed repeating period once after downtime", async () => {
    const record = { id: "tse_1", repId: "rep_1", assignedById: "admin_1", metric: TargetMetric.DELIVERED_BOXES, cadence: TargetCadence.WEEKLY, goalAmount: 20, nextStart: "2026-09-14", paused: false };
    const created: string[] = [];
    const seriesRepo = { find: jest.fn().mockResolvedValue([{ id: record.id }]), findOne: jest.fn().mockImplementation(async () => record), save: jest.fn().mockImplementation(async value => value) };
    const targetRepo = { findOneBy: jest.fn().mockImplementation(async ({ periodStart }: { periodStart: string }) => created.includes(periodStart) ? { periodStart } : null), findOne: jest.fn().mockResolvedValue(null), create: (value: object) => value, save: jest.fn().mockImplementation(async value => { created.push(value.periodStart); return value; }) };
    const manager = { getRepository: (type: { name: string }) => type.name === "TargetSeries" ? seriesRepo : targetRepo };
    const db = { transaction: (run: (value: typeof manager) => Promise<void>) => run(manager) };
    const service = new TargetsService({} as never, seriesRepo as never, db as never);
    await service["materialize"](new Date("2026-09-30T12:00:00Z"));
    expect(created).toEqual(["2026-09-14", "2026-09-21", "2026-09-28"]);
    expect(record.nextStart).toBe("2026-10-05");
    await service["materialize"](new Date("2026-09-30T12:00:00Z"));
    expect(created).toHaveLength(3);
  });
});
