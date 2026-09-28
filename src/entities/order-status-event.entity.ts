import { BeforeInsert, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { nanoid } from "nanoid";
import { Order } from "@/entities/order.entity";
import type { OrderStatus } from "@/entities/order.entity";
import { User } from "@/entities/user.entity";

@Entity({ name: "order_status_events" })
export class OrderStatusEvent {
  @PrimaryColumn({ type: "varchar", length: 24 }) id: string;
  @Column({ type: "varchar", length: 24 }) orderId: string;
  @Column({ type: "enum", enum: ["SUBMITTED", "ACCEPTED", "DELIVERED", "PARTIALLY_DELIVERED", "CANCELLED"], nullable: true }) previousStatus: OrderStatus | null;
  @Column({ type: "enum", enum: ["SUBMITTED", "ACCEPTED", "DELIVERED", "PARTIALLY_DELIVERED", "CANCELLED"] }) newStatus: OrderStatus;
  @Column({ type: "varchar", length: 24 }) actorId: string;
  @Column({ type: "text", nullable: true }) reason: string | null;
  @CreateDateColumn() createdAt: Date;
  @ManyToOne(() => Order, (order) => order.statusEvents, { onDelete: "CASCADE" }) @JoinColumn({ name: "orderId" }) order: Order;
  @ManyToOne(() => User, { onDelete: "RESTRICT" }) @JoinColumn({ name: "actorId" }) actor: User;
  @BeforeInsert() createId(): void { this.id = this.id || `evt_${nanoid(16)}`; }
}
