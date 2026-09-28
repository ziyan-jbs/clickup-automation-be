export enum AutomationRuleStatus {
  Active = "active",
  Paused = "paused",
  NeedsAttention = "needs_attention",
}

export enum ExistingTimeBehavior {
  Skip = "skip",
  TopUp = "top_up",
  Approval = "approval",
}

export enum AutomationRunStatus {
  Processing = "processing",
  AwaitingApproval = "awaiting_approval",
  Added = "added",
  Skipped = "skipped",
  Failed = "failed",
}

export enum AutomationRunTrigger {
  Scheduled = "scheduled",
  Manual = "manual",
  Backfill = "backfill",
}

export enum AuditOutcome {
  Success = "success",
  Failed = "failed",
  Skipped = "skipped",
}
