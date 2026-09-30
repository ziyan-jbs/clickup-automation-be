export enum TargetMetric { SALES_VALUE = "SALES_VALUE", DELIVERED_BOXES = "DELIVERED_BOXES", SHOPS_SERVED = "SHOPS_SERVED" }
export enum TargetCadence { WEEKLY = "WEEKLY", MONTHLY = "MONTHLY" }
const day = 86400000;
const karachiOffset = 5 * 60 * 60 * 1000;
export const localDate = (at: Date) => new Date(at.getTime() + karachiOffset).toISOString().slice(0, 10);
export function periodStart(date: string, cadence: TargetCadence): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date) throw new Error("Invalid date");
  if (cadence === TargetCadence.WEEKLY) d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
  else d.setUTCDate(1);
  return d.toISOString().slice(0, 10);
}
export function nextPeriod(start: string, cadence: TargetCadence): string {
  const d = new Date(`${start}T00:00:00Z`);
  if (cadence === TargetCadence.WEEKLY) d.setUTCDate(d.getUTCDate() + 7);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}
export const startUtc = (date: string) => new Date(new Date(`${date}T00:00:00Z`).getTime() - karachiOffset);
export const deadline = (start: string, cadence: TargetCadence) => new Date(startUtc(nextPeriod(start, cadence)).getTime() - 1);
export type Delivery = { id: string; shopId: string; deliveredTotalMinor: number; deliveredBoxes: number; deliveredAt: Date };
export function deliveredProgress(deliveries: Delivery[], metric: TargetMetric, cutoff: Date): number {
  const included = deliveries.filter(d => new Date(d.deliveredAt).getTime() <= cutoff.getTime());
  if (metric === TargetMetric.SALES_VALUE) return included.reduce((n, d) => n + Number(d.deliveredTotalMinor), 0);
  if (metric === TargetMetric.DELIVERED_BOXES) return included.reduce((n, d) => n + Number(d.deliveredBoxes), 0);
  return new Set(included.map(d => d.shopId)).size;
}
export type StreakPeriod = { start: string; goal: number; achieved: number; cancelled: boolean };
export function completionStreak(periods: StreakPeriod[], cadence: TargetCadence, today: string): number {
  const byStart = new Map(periods.filter(p => !p.cancelled).map(p => [p.start, p]));
  let cursor = periodStart(today, cadence);
  if (!byStart.get(cursor)) return 0;
  if (byStart.get(cursor)!.achieved < byStart.get(cursor)!.goal) {
    const previous = new Date(`${cursor}T00:00:00Z`);
    previous.setUTCDate(previous.getUTCDate() - 1);
    cursor = periodStart(previous.toISOString().slice(0, 10), cadence);
  }
  let count = 0;
  while (byStart.get(cursor)?.achieved! >= byStart.get(cursor)?.goal!) {
    count++;
    const previous = new Date(`${cursor}T00:00:00Z`);
    previous.setUTCDate(previous.getUTCDate() - 1);
    cursor = periodStart(previous.toISOString().slice(0, 10), cadence);
  }
  return count;
}
export function pace(achieved: number, goal: number, due: Date, now: Date) {
  const remaining = Math.max(0, goal - achieved);
  const days = Math.max(1, Math.ceil((due.getTime() - now.getTime()) / day));
  return { remaining, dailyPace: now > due ? 0 : Math.ceil(remaining / days), percentage: Math.round(achieved / goal * 100) };
}
