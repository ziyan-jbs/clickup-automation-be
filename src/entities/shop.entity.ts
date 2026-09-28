import { BeforeInsert, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { nanoid } from "nanoid";
import { User } from "@/entities/user.entity";

@Entity({ name: "shops" })
@Index(["assignedRepId", "isActive"])
export class Shop {
  @PrimaryColumn({ type: "varchar", length: 24 }) id: string;
  @Column({ type: "varchar", length: 180 }) name: string;
  @Column({ type: "varchar", length: 160, nullable: true }) contactPerson: string | null;
  @Column({ type: "varchar", length: 50, nullable: true }) phone: string | null;
  @Column({ type: "text", nullable: true }) address: string | null;
  @Column({ type: "varchar", length: 100 }) area: string;
  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true }) latitude: string | null;
  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true }) longitude: string | null;
  @Column({ type: "boolean", default: true }) isActive: boolean;
  @Column({ type: "varchar", length: 24, nullable: true }) assignedRepId: string | null;
  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" }) @JoinColumn({ name: "assignedRepId" }) assignedRep: User | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @BeforeInsert() createId(): void { this.id = this.id || `shp_${nanoid(16)}`; }
}
