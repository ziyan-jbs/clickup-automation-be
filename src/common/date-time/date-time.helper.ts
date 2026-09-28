import { BadRequestException } from "@nestjs/common";
import { DateTime, IANAZone } from "luxon";

export const DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function assertTimezone(timezone: string): void {
  if (!IANAZone.isValidZone(timezone)) throw new BadRequestException("timezone must be a valid IANA timezone");
}

export function localDay(date: string, timezone: string): DateTime {
  const value = DateTime.fromISO(date, { zone: timezone });
  if (!value.isValid || value.toISODate() !== date) throw new BadRequestException("Invalid calendar date");
  return value.startOf("day");
}

export function dayBoundsMs(date: string, timezone: string): { startMs: number; endMs: number } {
  const start = localDay(date, timezone);
  return { startMs: start.toMillis(), endMs: start.plus({ days: 1 }).toMillis() - 1 };
}

export function entryStartMs(date: string, time: string, timezone: string): number {
  const value = DateTime.fromISO(`${date}T${time}`, { zone: timezone });
  if (!value.isValid) throw new BadRequestException("Invalid entry start time");
  return value.toMillis();
}
