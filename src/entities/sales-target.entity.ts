import { BeforeInsert, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { nanoid } from "nanoid";
import { User } from "@/entities/user.entity";
import { TargetSeries } from "@/entities/target-series.entity";
import { TargetCadence, TargetMetric } from "@/routes/targets/targets.logic";
@Entity({ name: "sales_targets" })
@Index(["repId", "metric", "cadence", "periodStart"])
export class SalesTarget {
  @PrimaryColumn({ type: "varchar", length: 24 }) id: string;
  @Column({ type: "varchar", length: 24 }) repId: string;
  @Column({ type: "varchar", length: 24 }) assignedById: string;
  @Column({ type: "varchar", length: 24, nullable: true }) seriesId: string | null;
  @Column({ type: "enum", enum: TargetMetric, enumName: "target_metric_enum" }) metric: TargetMetric;
  @Column({ type: "enum", enum: TargetCadence, enumName: "target_cadence_enum" }) cadence: TargetCadence;
  @Column({ type: "date" }) periodStart: string;
  @Column({ type: "integer" }) goalAmount: number;
  @Column({ type: "timestamptz", nullable: true }) cancelledAt: Date | null;
  @Column({ type: "varchar", length: 24, nullable: true }) cancelledById: string | null;
  @ManyToOne(() => User, { onDelete: "RESTRICT" }) @JoinColumn({ name: "repId" }) rep: User;
  @ManyToOne(() => User, { onDelete: "RESTRICT" }) @JoinColumn({ name: "assignedById" }) assignedBy: User;
  @ManyToOne(() => TargetSeries, { nullable: true, onDelete: "SET NULL" }) @JoinColumn({ name: "seriesId" }) series: TargetSeries | null;
  @CreateDateColumn() createdAt: Date;
  @BeforeInsert() createId() { this.id ||= `tgt_${nanoid(16)}`; }
}
