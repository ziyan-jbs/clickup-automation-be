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
import { ClickUpConnection } from "@/entities/clickup-connection.entity";
import { ClickUpTask } from "@/entities/clickup-task.entity";

@Entity({ name: "clickup_workspaces" })
@Index(["connectionId", "clickupWorkspaceId"], { unique: true })
export class ClickUpWorkspace {
  @PrimaryColumn({ type: "varchar", length: 14 })
  id: string;

  @Column({ type: "varchar", length: 14 })
  connectionId: string;

  @ManyToOne(() => ClickUpConnection, (connection) => connection.workspaces, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "connectionId" })
  connection: ClickUpConnection;

  @Column({ type: "varchar", length: 80 })
  clickupWorkspaceId: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 80, default: "Asia/Karachi" })
  timezone: string;

  @Column({ type: "timestamptz", nullable: true })
  lastSyncedAt: Date | null;

  @Column({ type: "boolean", default: true })
  isAuthorized: boolean;

  @OneToMany(() => ClickUpTask, (task) => task.workspace)
  tasks: ClickUpTask[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  setId(): void {
    this.id = this.id || generateId(IdPrefix.ClickUpWorkspace);
  }
}
