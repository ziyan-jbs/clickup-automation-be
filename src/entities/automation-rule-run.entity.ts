import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

import { IdPrefix } from "@/common/constants/id-prefix.constants";
import { generateId } from "@/common/helpers/id.helper";
import { AutomationRule } from "@/entities/automation-rule.entity";
import { ClickUpTask } from "@/entities/clickup-task.entity";
import { User } from "@/entities/user.entity";
import { AutomationRunStatus, AutomationRunTrigger } from "@/types/automation.types";

@Entity({ name: "automation_rule_runs" })
@Index(["userId", "taskId", "ruleId", "targetDate"], { unique: true })
@Index(["status", "createdAt"])
export class AutomationRuleRun {
  @PrimaryColumn({ type: "varchar", length: 14 })
  id: string;

  @Column({ type: "varchar", length: 14 })
  ruleId: string;

  @ManyToOne(() => AutomationRule, (rule) => rule.runs, { onDelete: "CASCADE" })
  @JoinColumn({ name: "ruleId" })
  rule: AutomationRule;

  @Column({ type: "varchar", length: 14 })
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", length: 14 })
  taskId: string;

  @ManyToOne(() => ClickUpTask, { onDelete: "CASCADE" })
  @JoinColumn({ name: "taskId" })
  task: ClickUpTask;

  @Column({ type: "date" })
  targetDate: string;

  @Column({ type: "integer" })
  expectedMinutes: number;

  @Column({ type: "integer", nullable: true })
  existingMinutes: number | null;

  @Column({ type: "integer", nullable: true })
  addedMinutes: number | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  clickupTimeEntryId: string | null;

  @Column({
    type: "enum",
    enum: AutomationRunStatus,
    default: AutomationRunStatus.Processing,
  })
  status: AutomationRunStatus;

  @Column({ type: "enum", enum: AutomationRunTrigger, default: AutomationRunTrigger.Scheduled })
  trigger: AutomationRunTrigger;

  @Column({ type: "text", nullable: true })
  errorMessage: string | null;

  @Column({ type: "jsonb", default: () => "'{}'" })
  metadata: Record<string, unknown>;

  @Column({ type: "timestamptz", nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  setId(): void {
    this.id = this.id || generateId(IdPrefix.AutomationRuleRun);
  }
}
