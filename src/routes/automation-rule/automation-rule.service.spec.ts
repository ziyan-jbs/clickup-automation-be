import { AutomationRuleService } from "@/routes/automation-rule/automation-rule.service";
import { AutomationRunStatus, AutomationRunTrigger, ExistingTimeBehavior } from "@/types/automation.types";

describe("AutomationRuleService decision engine", () => {
  const service = new AutomationRuleService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  const decide = (target: number, existing: number, behavior: ExistingTimeBehavior) =>
    (service as unknown as { decide(target: number, existing: number, behavior: ExistingTimeBehavior): { minutesToAdd: number; action: string } }).decide(target, existing, behavior);

  it("adds the full target only when skip behavior sees no existing time", () => {
    expect(decide(420, 0, ExistingTimeBehavior.Skip).minutesToAdd).toBe(420);
    expect(decide(420, 1, ExistingTimeBehavior.Skip).minutesToAdd).toBe(0);
  });

  it("tops up only the missing workspace total", () => {
    expect(decide(420, 120, ExistingTimeBehavior.TopUp).minutesToAdd).toBe(300);
    expect(decide(420, 480, ExistingTimeBehavior.TopUp).minutesToAdd).toBe(0);
  });

  it("marks missing approval time for approval without changing its amount", () => {
    expect(decide(420, 60, ExistingTimeBehavior.Approval)).toMatchObject({ minutesToAdd: 360, action: "await_approval" });
  });

  it("returns an existing completed run instead of writing duplicate ClickUp time", async () => {
    const existingRun = {
      id: "run_test",
      ruleId: "rule_test",
      userId: "usr_test",
      taskId: "task_test",
      targetDate: "2025-01-06",
      expectedMinutes: 420,
      existingMinutes: 0,
      addedMinutes: 420,
      clickupTimeEntryId: "clickup_entry",
      status: AutomationRunStatus.Added,
      trigger: AutomationRunTrigger.Manual,
      errorMessage: null,
      metadata: {},
      completedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const ruleRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: "rule_test",
        userId: "usr_test",
        taskId: "task_test",
        startDate: "2025-01-01",
        endDate: null,
        daysOfWeek: ["Mon"],
        task: { id: "task_test", workspace: { connection: {} } },
      }),
    };
    const runRepository = { findOneBy: jest.fn().mockResolvedValue(existingRun) };
    const preferenceRepository = { findOneBy: jest.fn().mockResolvedValue({ timezone: "UTC" }) };
    const clickUpApiClient = { createTimeEntry: jest.fn() };
    const idempotentService = new AutomationRuleService(
      ruleRepository as never,
      runRepository as never,
      {} as never,
      preferenceRepository as never,
      clickUpApiClient as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const result = await idempotentService.execute("usr_test", "rule_test", "2025-01-06");

    expect(result).toEqual(expect.objectContaining({ id: "run_test", status: AutomationRunStatus.Added }));
    expect(clickUpApiClient.createTimeEntry).not.toHaveBeenCalled();
  });
});
