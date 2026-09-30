import { BeforeInsert, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { nanoid } from "nanoid";
import { User } from "@/entities/user.entity";
import { TargetCadence, TargetMetric } from "@/routes/targets/targets.logic";
@Entity({ name: "target_series" })
export class TargetSeries {
  @PrimaryColumn({ type: "varchar", length: 24 }) id: string;
  @Column({ type: "varchar", length: 24 }) repId: string;
  @Column({ type: "varchar", length: 24 }) assignedById: string;
  @Column({ type: "enum", enum: TargetMetric, enumName: "target_metric_enum" }) metric: TargetMetric;
  @Column({ type: "enum", enum: TargetCadence, enumName: "target_cadence_enum" }) cadence: TargetCadence;
  @Column({ type: "integer" }) goalAmount: number;
  @Column({ type: "date" }) nextStart: string;
  @Column({ type: "boolean", default: false }) paused: boolean;
  @ManyToOne(() => User, { onDelete: "RESTRICT" }) @JoinColumn({ name: "repId" }) rep: User;
  @ManyToOne(() => User, { onDelete: "RESTRICT" }) @JoinColumn({ name: "assignedById" }) assignedBy: User;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @BeforeInsert() createId() { this.id ||= `tse_${nanoid(16)}`; }
}
