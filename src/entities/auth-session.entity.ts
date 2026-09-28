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
import { User } from "@/entities/user.entity";

@Entity({ name: "auth_sessions" })
@Index(["refreshTokenHash"], { unique: true })
@Index(["userId", "expiresAt"])
export class AuthSession {
  @PrimaryColumn({ type: "varchar", length: 14 })
  id: string;

  @Column({ type: "varchar", length: 14 })
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", length: 64 })
  refreshTokenHash: string;

  @Column({ type: "timestamptz" })
  expiresAt: Date;

  @Column({ type: "timestamptz", nullable: true })
  revokedAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  ip: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  userAgent: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  setId(): void {
    this.id = this.id || generateId(IdPrefix.AuthSession);
  }
}
