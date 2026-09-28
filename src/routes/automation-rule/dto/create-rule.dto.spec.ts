import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { CreateRuleDto } from "@/routes/automation-rule/dto/create-rule.dto";

describe("CreateRuleDto", () => {
  const valid = {
    taskId: "cut_1234567890",
    name: "Weekday fill",
    minutesPerDay: 420,
    daysOfWeek: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    startDate: "2026-06-01",
    existingTimeBehavior: "top_up",
    skipPublicHolidays: false,
  };

  it("accepts minute-precise rule durations", async () => {
    expect(await validate(plainToInstance(CreateRuleDto, { ...valid, minutesPerDay: 5 }))).toHaveLength(0);
  });

  it("rejects unavailable public-holiday automation", async () => {
    const errors = await validate(plainToInstance(CreateRuleDto, { ...valid, skipPublicHolidays: true }));
    expect(errors.some((error) => error.property === "skipPublicHolidays")).toBe(true);
  });

  it("rejects invalid weekdays and durations", async () => {
    const errors = await validate(plainToInstance(CreateRuleDto, { ...valid, minutesPerDay: 0, daysOfWeek: ["Someday"] }));
    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(["minutesPerDay", "daysOfWeek"]));
  });
});
