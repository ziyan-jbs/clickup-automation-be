import { assertTimezone, dayBoundsMs, entryStartMs } from "@/common/date-time/date-time.helper";

describe("date-time helpers", () => {
  it("uses local calendar boundaries, including daylight-saving days", () => {
    const springForward = dayBoundsMs("2026-03-08", "America/New_York");
    expect(springForward.endMs - springForward.startMs + 1).toBe(23 * 60 * 60 * 1000);
  });

  it("creates a ClickUp start timestamp in the user timezone", () => {
    expect(new Date(entryStartMs("2026-06-22", "09:00", "Asia/Karachi")).toISOString()).toBe("2026-06-22T04:00:00.000Z");
  });

  it("rejects invalid IANA timezones", () => {
    expect(() => assertTimezone("Moon/SeaOfTranquility")).toThrow();
  });
});
