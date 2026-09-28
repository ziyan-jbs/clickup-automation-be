import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

import { IdPrefix } from "@/common/constants/id-prefix.constants";
import { generateId } from "@/common/helpers/id.helper";
import { AutomationRuleRun } from "@/entities/automation-rule-run.entity";
import { ClickUpTask } from "@/entities/clickup-task.entity";
import { User } from "@/entities/user.entity";
import { AutomationRuleStatus, ExistingTimeBehavior } from "@/types/automation.types";

@Entity({ name: "automation_rules" })
@Index(["userId", "status"])
@Index(["taskId", "status"])
export class AutomationRule {
  @PrimaryColumn({ type: "varchar", length: 14 })
  id: string;

  @Column({ type: "varchar", length: 14 })
  userId: string;

  @ManyToOne(() => User, (user) => user.automationRules, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", length: 14 })
  taskId: string;

  @ManyToOne(() => ClickUpTask, (task) => task.automationRules, { onDelete: "CASCADE" })
  @JoinColumn({ name: "taskId" })
  task: ClickUpTask;

  @Column({ type: "varchar", length: 160 })
  name: string;

  @Column({ type: "integer" })
  minutesPerDay: number;

  @Column({ type: "varchar", array: true })
  daysOfWeek: string[];

  @Column({ type: "date" })
  startDate: string;

  @Column({ type: "date", nullable: true })
  endDate: string | null;

  @Column({ type: "boolean", default: true })
  skipWeekends: boolean;

  @Column({ type: "boolean", default: false })
  skipPublicHolidays: boolean;

  @Column({
    type: "enum",
    enum: ExistingTimeBehavior,
    default: ExistingTimeBehavior.Skip,
  })
  existingTimeBehavior: ExistingTimeBehavior;

  @Column({
    type: "enum",
    enum: AutomationRuleStatus,
    default: AutomationRuleStatus.Active,
  })
  status: AutomationRuleStatus;

  @Column({ type: "varchar", length: 500, nullable: true })
  timeEntryDescription: string | null;

  @Column({ type: "text", nullable: true })
  auditNote: string | null;

  @Column({ type: "timestamptz", nullable: true })
  lastRunAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  nextRunAt: Date | null;

  @OneToMany(() => AutomationRuleRun, (run) => run.rule)
  runs: AutomationRuleRun[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;

  @BeforeInsert()
  setId(): void {
    this.id = this.id || generateId(IdPrefix.AutomationRule);
  }
}
