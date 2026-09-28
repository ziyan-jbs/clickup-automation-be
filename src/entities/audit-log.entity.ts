import { BeforeInsert, Column, CreateDateColumn, Entity, Index, PrimaryColumn } from "typeorm";

import { IdPrefix } from "@/common/constants/id-prefix.constants";
import { generateId } from "@/common/helpers/id.helper";
import { AuditOutcome } from "@/types/automation.types";

@Entity({ name: "audit_logs" })
@Index(["userId", "createdAt"])
@Index(["action", "createdAt"])
@Index(["targetType", "targetId"])
export class AuditLog {
  @PrimaryColumn({ type: "varchar", length: 14 })
  id: string;

  @Column({ type: "varchar", length: 120 })
  action: string;

  @Column({ type: "varchar", length: 80, nullable: true })
  targetType: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  targetId: string | null;

  @Column({ type: "varchar", length: 14, nullable: true })
  userId: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  requestId: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  ip: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  userAgent: string | null;

  @Column({ type: "enum", enum: AuditOutcome, default: AuditOutcome.Success })
  outcome: AuditOutcome;

  @Column({ type: "jsonb", default: () => "'{}'" })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  setId(): void {
    this.id = this.id || generateId(IdPrefix.AuditLog);
  }
}
