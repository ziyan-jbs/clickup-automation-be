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
import { ClickUpWorkspace } from "@/entities/clickup-workspace.entity";
import { User } from "@/entities/user.entity";

@Entity({ name: "clickup_connections" })
@Index(["userId", "clickupUserId"], { unique: true })
@Index(["clickupUserId"], { unique: true })
export class ClickUpConnection {
  @PrimaryColumn({ type: "varchar", length: 14 })
  id: string;

  @Column({ type: "varchar", length: 14 })
  userId: string;

  @ManyToOne(() => User, (user) => user.clickupConnections, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", length: 80 })
  clickupUserId: string;

  @Column({ type: "varchar", length: 255 })
  clickupEmail: string;

  @Column({ type: "text", nullable: true })
  encryptedAccessToken: string | null;

  @Column({ type: "text", nullable: true })
  encryptedRefreshToken: string | null;

  @Column({ type: "timestamptz", nullable: true })
  tokenExpiresAt: Date | null;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @OneToMany(() => ClickUpWorkspace, (workspace) => workspace.connection)
  workspaces: ClickUpWorkspace[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  setId(): void {
    this.id = this.id || generateId(IdPrefix.ClickUpConnection);
  }
}
