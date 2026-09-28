import { BeforeInsert, Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { nanoid } from "nanoid";

export enum UserRole { ADMIN = "ADMIN", SALES_REP = "SALES_REP" }

@Entity({ name: "users" })
export class User {
  @PrimaryColumn({ type: "varchar", length: 24 }) id: string;
  @Index({ unique: true }) @Column({ type: "varchar", length: 255 }) email: string;
  @Column({ type: "varchar", length: 160 }) name: string;
  @Column({ type: "text", select: false }) passwordHash: string;
  @Column({ type: "enum", enum: UserRole }) role: UserRole;
  @Column({ type: "boolean", default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @BeforeInsert() createId(): void { this.id = this.id || `usr_${nanoid(16)}`; }
}
