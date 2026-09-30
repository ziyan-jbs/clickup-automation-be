import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { nanoid } from "nanoid";

@Entity({ name: "products" })
export class Product {
  @PrimaryColumn({ type: "varchar", length: 24 }) id: string;
  @Index({ unique: true }) @Column({ type: "varchar", length: 64 }) sku: string;
  @Column({ type: "varchar", length: 160 }) name: string;
  @Column({ type: "varchar", length: 100, nullable: true }) category: string | null;
  @Column({ type: "varchar", length: 500, nullable: true }) imageUrl: string | null;
  @Column({ type: "integer" }) pricePerBoxMinor: number;
  @Column({ type: "integer" }) unitsPerBox: number;
  @Column({ type: "integer", default: 0 }) availableBoxes: number;
  @Column({ type: "boolean", default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @BeforeInsert() createId(): void {
    this.id = this.id || `prd_${nanoid(16)}`;
  }
}
