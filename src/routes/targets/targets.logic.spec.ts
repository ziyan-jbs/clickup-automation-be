import { completionStreak, deadline, deliveredProgress, localDate, nextPeriod, pace, periodStart, startUtc, TargetCadence, TargetMetric } from "./targets.logic";

describe("target period boundaries", () => {
  it("uses Monday and calendar month starts in Karachi", () => {
    expect(periodStart("2026-09-30", TargetCadence.WEEKLY)).toBe("2026-09-28");
    expect(nextPeriod("2026-09-28", TargetCadence.WEEKLY)).toBe("2026-10-05");
    expect(periodStart("2026-09-30", TargetCadence.MONTHLY)).toBe("2026-09-01");
    expect(nextPeriod("2026-12-01", TargetCadence.MONTHLY)).toBe("2027-01-01");
    expect(startUtc("2026-09-28").toISOString()).toBe("2026-09-27T19:00:00.000Z");
    expect(deadline("2026-09-28", TargetCadence.WEEKLY).toISOString()).toBe("2026-10-04T18:59:59.999Z");
    expect(localDate(new Date("2026-09-27T20:00:00Z"))).toBe("2026-09-28");
  });
  it("rejects invalid calendar dates", () => expect(() => periodStart("2026-02-30", TargetCadence.MONTHLY)).toThrow());
});

describe("delivered target progress", () => {
  const deliveries = [
    { id: "a", shopId: "shop1", deliveredTotalMinor: 30000, deliveredBoxes: 3, deliveredAt: new Date("2026-09-28T10:00:00Z") },
    { id: "b", shopId: "shop1", deliveredTotalMinor: 20000, deliveredBoxes: 2, deliveredAt: new Date("2026-09-29T10:00:00Z") },
    { id: "c", shopId: "shop2", deliveredTotalMinor: 15000, deliveredBoxes: 1, deliveredAt: new Date("2026-09-30T10:00:00Z") },
  ];
  it("uses partial delivery amounts and boxes, with unique shops and as-of cutoff", () => {
    const now = new Date("2026-09-29T20:00:00Z");
    expect(deliveredProgress(deliveries, TargetMetric.SALES_VALUE, now)).toBe(50000);
    expect(deliveredProgress(deliveries, TargetMetric.DELIVERED_BOXES, now)).toBe(5);
    expect(deliveredProgress(deliveries, TargetMetric.SHOPS_SERVED, now)).toBe(1);
    expect(deliveredProgress(deliveries, TargetMetric.SHOPS_SERVED, new Date("2026-10-01T00:00:00Z"))).toBe(2);
  });
  it("counts deliveries before a mid-period assignment", () => {
    expect(deliveredProgress(deliveries, TargetMetric.SALES_VALUE, new Date("2026-09-30T12:00:00Z"))).toBe(65000);
  });
  it("computes remaining amount and daily pace", () => {
    expect(pace(4, 10, new Date("2026-10-04T18:59:59Z"), new Date("2026-10-02T18:59:59Z"))).toMatchObject({ remaining: 6, dailyPace: 3, percentage: 40 });
  });
});

describe("completion streak", () => {
  const p = (start: string, achieved: number) => ({ start, goal: 10, achieved, cancelled: false });
  it("includes an early completed current period", () => expect(completionStreak([p("2026-09-28", 10), p("2026-09-21", 10)], TargetCadence.WEEKLY, "2026-09-30")).toBe(2));
  it("keeps prior streak while current target is in progress", () => expect(completionStreak([p("2026-09-28", 3), p("2026-09-21", 10)], TargetCadence.WEEKLY, "2026-09-30")).toBe(1));
  it("breaks for unassigned, missed, or cancelled periods", () => {
    expect(completionStreak([p("2026-09-28", 10), p("2026-09-14", 10)], TargetCadence.WEEKLY, "2026-09-30")).toBe(1);
    expect(completionStreak([p("2026-09-28", 2), p("2026-09-21", 2)], TargetCadence.WEEKLY, "2026-09-30")).toBe(0);
    expect(completionStreak([{ ...p("2026-09-28", 10), cancelled: true }], TargetCadence.WEEKLY, "2026-09-30")).toBe(0);
  });
  it("tracks monthly streaks separately from weekly periods", () => {
    expect(completionStreak([p("2026-09-01", 10), p("2026-08-01", 10), p("2026-07-01", 5)], TargetCadence.MONTHLY, "2026-09-30")).toBe(2);
  });
});
