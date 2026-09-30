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
import { nanoid } from "nanoid";
import { Shop } from "@/entities/shop.entity";
import { User } from "@/entities/user.entity";
import { OrderLine } from "@/entities/order-line.entity";
import { OrderStatusEvent } from "@/entities/order-status-event.entity";

export enum OrderStatus {
  SUBMITTED = "SUBMITTED",
  ACCEPTED = "ACCEPTED",
  PICKED_UP = "PICKED_UP",
  DELIVERED = "DELIVERED",
  PARTIALLY_DELIVERED = "PARTIALLY_DELIVERED",
  CANCELLED = "CANCELLED",
}
@Entity({ name: "orders" })
@Index(["status", "deliveredAt"])
@Index(["repId", "submittedAt"])
@Index(["shopId", "submittedAt"])
export class Order {
  @PrimaryColumn({ type: "varchar", length: 24 }) id: string;
  @Index({ unique: true }) @Column({ type: "varchar", length: 32 }) orderNumber: string;
  @Column({ type: "varchar", length: 24 }) shopId: string;
  @Column({ type: "varchar", length: 24 }) repId: string;
  @Column({ type: "enum", enum: OrderStatus, default: OrderStatus.SUBMITTED }) status: OrderStatus;
  @Column({ type: "varchar", length: 3, default: "PKR" }) currency: string;
  @Column({ type: "integer" }) orderedTotalMinor: number;
  @Column({ type: "integer", default: 0 }) deliveredTotalMinor: number;
  @Column({ type: "text", nullable: true }) notes: string | null;
  @Index({ unique: true }) @Column({ type: "varchar", length: 100 }) idempotencyKey: string;
  @Column({ type: "timestamptz" }) submittedAt: Date;
  @Column({ type: "timestamptz", nullable: true }) acceptedAt: Date | null;
  @Column({ type: "timestamptz", nullable: true }) pickedUpAt: Date | null;
  @Column({ type: "timestamptz", nullable: true }) deliveredAt: Date | null;
  @ManyToOne(() => Shop, { onDelete: "RESTRICT" }) @JoinColumn({ name: "shopId" }) shop: Shop;
  @ManyToOne(() => User, { onDelete: "RESTRICT" }) @JoinColumn({ name: "repId" }) rep: User;
  @OneToMany(() => OrderLine, (line) => line.order) lines: OrderLine[];
  @OneToMany(() => OrderStatusEvent, (event) => event.order) statusEvents: OrderStatusEvent[];
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @BeforeInsert() createId(): void {
    this.id = this.id || `ord_${nanoid(16)}`;
    this.orderNumber =
      this.orderNumber ||
      `SO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${nanoid(6).toUpperCase()}`;
  }
}
