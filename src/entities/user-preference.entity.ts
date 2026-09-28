import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

import { IdPrefix } from "@/common/constants/id-prefix.constants";
import { generateId } from "@/common/helpers/id.helper";
import { ClickUpWorkspace } from "@/entities/clickup-workspace.entity";
import { User } from "@/entities/user.entity";

@Entity({ name: "user_preferences" })
export class UserPreference {
  @PrimaryColumn({ type: "varchar", length: 14 })
  id: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 14 })
  userId: string;

  @OneToOne(() => User, (user) => user.preference, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", length: 14, nullable: true })
  activeWorkspaceId: string | null;

  @OneToOne(() => ClickUpWorkspace, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "activeWorkspaceId" })
  activeWorkspace: ClickUpWorkspace | null;

  @Column({ type: "varchar", length: 80, default: "Asia/Karachi" })
  timezone: string;

  @Column({ type: "varchar", length: 5, default: "03:00" })
  runTime: string;

  @Column({ type: "integer", default: 420 })
  defaultDailyMinutes: number;

  @Column({ type: "varchar", length: 5, default: "09:00" })
  defaultEntryStartTime: string;

  @Column({ type: "boolean", default: true })
  emailNotifications: boolean;

  @Column({ type: "boolean", default: false })
  pushNotifications: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  setId(): void {
    this.id = this.id || generateId(IdPrefix.UserPreference);
  }
}
