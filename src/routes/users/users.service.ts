import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as argon2 from "argon2";
import { Repository } from "typeorm";
import { User, UserRole } from "@/entities/user.entity";
@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}
  async createRep(input: { name: string; email: string; password: string; requiresShopApproval?: boolean }) {
    if (await this.users.exist({ where: { email: input.email.toLowerCase() } }))
      throw new ConflictException("Email is already in use");
    const user = this.users.create({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: await argon2.hash(input.password),
      role: UserRole.SALES_REP,
      isActive: true,
      requiresShopApproval: input.requiresShopApproval ?? true,
    });
    try {
      return this.serialize(await this.users.save(user));
    } catch (error) {
      if ((error as { driverError?: { code?: string } }).driverError?.code === "23505")
        throw new ConflictException("Email is already in use");
      throw error;
    }
  }
  async list() {
    return (
      await this.users.find({ where: { role: UserRole.SALES_REP }, order: { name: "ASC" } })
    ).map((user) => this.serialize(user));
  }
  async setStatus(id: string, isActive: boolean) {
    const user = await this.users.findOneBy({ id, role: UserRole.SALES_REP });
    if (!user) throw new NotFoundException("Sales representative not found");
    user.isActive = isActive;
    return this.serialize(await this.users.save(user));
  }
  serialize(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      requiresShopApproval: user.requiresShopApproval,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
