import {
  BeforeInsert,
  Column,
  CreateDateColumn,
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
import { AutomationRule } from "@/entities/automation-rule.entity";
import { ClickUpWorkspace } from "@/entities/clickup-workspace.entity";

@Entity({ name: "clickup_tasks" })
@Index(["workspaceId", "clickupTaskId"], { unique: true })
@Index(["assigneeClickupUserId", "status"])
export class ClickUpTask {
  @PrimaryColumn({ type: "varchar", length: 14 })
  id: string;

  @Column({ type: "varchar", length: 14 })
  workspaceId: string;

  @ManyToOne(() => ClickUpWorkspace, (workspace) => workspace.tasks, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspaceId" })
  workspace: ClickUpWorkspace;

  @Column({ type: "varchar", length: 80 })
  clickupTaskId: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 80 })
  status: string;

  @Column({ type: "varchar", length: 160, nullable: true })
  listName: string | null;

  @Column({ type: "varchar", length: 160, nullable: true })
  spaceName: string | null;

  @Column({ type: "varchar", length: 80 })
  assigneeClickupUserId: string;

  @Column({ type: "timestamptz", nullable: true })
  dueAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  clickupUpdatedAt: Date | null;

  @Column({ type: "varchar", length: 500 })
  url: string;

  @Column({ type: "integer", default: 0 })
  trackedMinutes: number;

  @Column({ type: "boolean", default: false })
  isClosed: boolean;

  @Column({ type: "boolean", default: true })
  isAvailable: boolean;

  @Column({ type: "timestamptz", nullable: true })
  lastSyncedAt: Date | null;

  @OneToMany(() => AutomationRule, (rule) => rule.task)
  automationRules: AutomationRule[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  setId(): void {
    this.id = this.id || generateId(IdPrefix.ClickUpTask);
  }
}
