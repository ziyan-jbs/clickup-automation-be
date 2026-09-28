import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

import { IdPrefix } from "@/common/constants/id-prefix.constants";
import { generateId } from "@/common/helpers/id.helper";
import { AutomationRule } from "@/entities/automation-rule.entity";
import { ClickUpConnection } from "@/entities/clickup-connection.entity";
import { UserPreference } from "@/entities/user-preference.entity";

@Entity({ name: "users" })
export class User {
  @PrimaryColumn({ type: "varchar", length: 14 })
  id: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 255 })
  email: string;

  @Column({ type: "varchar", length: 160 })
  name: string;

  @Column({ type: "text", nullable: true, select: false })
  passwordHash: string | null;

  @Column({ type: "varchar", length: 80, default: "Asia/Karachi" })
  timezone: string;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @OneToMany(() => ClickUpConnection, (connection) => connection.user)
  clickupConnections: ClickUpConnection[];

  @OneToMany(() => AutomationRule, (rule) => rule.user)
  automationRules: AutomationRule[];

  @OneToOne(() => UserPreference, (preference) => preference.user)
  preference: UserPreference;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;

  @BeforeInsert()
  setId(): void {
    this.id = this.id || generateId(IdPrefix.User);
  }
}
