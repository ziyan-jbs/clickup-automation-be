import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { nanoid } from "nanoid";
import { Order } from "@/entities/order.entity";
import { Product } from "@/entities/product.entity";

@Entity({ name: "order_lines" })
export class OrderLine {
  @PrimaryColumn({ type: "varchar", length: 24 }) id: string;
  @Column({ type: "varchar", length: 24 }) orderId: string;
  @Index("IDX_order_lines_productId") @Column({ type: "varchar", length: 24 }) productId: string;
  @Column({ type: "integer" }) orderedBoxes: number;
  @Column({ type: "integer", default: 0 }) acceptedBoxes: number;
  @Column({ type: "integer", default: 0 }) deliveredBoxes: number;
  @Column({ type: "integer" }) unitPriceMinor: number;
  @Column({ type: "varchar", length: 160 }) productName: string;
  @Column({ type: "varchar", length: 64 }) productSku: string;
  @Column({ type: "integer" }) unitsPerBox: number;
  @Column({ type: "integer" }) orderedLineTotalMinor: number;
  @Column({ type: "integer", default: 0 }) deliveredLineTotalMinor: number;
  @ManyToOne(() => Order, (order) => order.lines, { onDelete: "CASCADE" })
  @JoinColumn({ name: "orderId" })
  order: Order;
  @ManyToOne(() => Product, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "productId" })
  product: Product;
  @BeforeInsert() createId(): void {
    this.id = this.id || `lin_${nanoid(16)}`;
  }
}
