import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Order } from "@/entities/order.entity";
import { Shop, ShopApprovalStatus } from "@/entities/shop.entity";
import { User, UserRole } from "@/entities/user.entity";
import { ShopQuery } from "@/routes/shops/shops.dto";
@Injectable()
export class ShopsService {
  constructor(
    @InjectRepository(Shop) private readonly shops: Repository<Shop>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    private readonly dataSource: DataSource,
  ) {}
  async verifyRep(id: string | null | undefined) {
    if (!id) return;
    const rep = await this.users.findOneBy({ id, role: UserRole.SALES_REP, isActive: true });
    if (!rep) throw new NotFoundException("Active sales representative not found");
  }
  async create(input: Partial<Shop>) {
    await this.verifyRep(input.assignedRepId);
    const saved = await this.shops.save(this.shops.create(input));
    return this.shops.findOneByOrFail({ id: saved.id });
  }
  async request(repId: string, input: Partial<Shop>) {
    const rep = await this.users.findOneByOrFail({ id: repId, role: UserRole.SALES_REP });
    const shop = this.shops.create({
      name: input.name, contactPerson: input.contactPerson, phone: input.phone,
      address: input.address, area: input.area, latitude: input.latitude,
      longitude: input.longitude, assignedRepId: repId,
      approvalStatus: rep.requiresShopApproval ? ShopApprovalStatus.PENDING : ShopApprovalStatus.APPROVED,
      isActive: !rep.requiresShopApproval,
    });
    return this.shops.save(shop);
  }
  async review(id: string, status: ShopApprovalStatus) {
    if (![ShopApprovalStatus.APPROVED, ShopApprovalStatus.REJECTED].includes(status))
      throw new ConflictException("Choose approved or rejected");
    return this.dataSource.transaction(async (manager) => {
      const shop = await manager.getRepository(Shop).findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!shop) throw new NotFoundException("Shop not found");
      if (shop.approvalStatus !== ShopApprovalStatus.PENDING)
        throw new ConflictException("Only pending shop requests can be reviewed");
      shop.approvalStatus = status;
      shop.isActive = status === ShopApprovalStatus.APPROVED;
      return manager.save(shop);
    });
  }
  async list(repId?: string, query: ShopQuery = {}) {
    const { page = 1, limit = 25 } = query;
    const [items, total] = await this.shops.findAndCount({
      where: { ...(repId ? { assignedRepId: repId } : {}), ...(query.approvalStatus ? { approvalStatus: query.approvalStatus } : {}) },
      relations: { assignedRep: true },
      order: { name: "ASC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }
  async get(id: string, requestingRepId?: string) {
    const shop = await this.shops.findOne({ where: { id }, relations: { assignedRep: true } });
    if (!shop) throw new NotFoundException("Shop not found");
    if (requestingRepId && shop.assignedRepId !== requestingRepId)
      throw new ForbiddenException("This shop is not assigned to you");
    const recentOrders = await this.orders.find({
      where: { shopId: id, ...(requestingRepId ? { repId: requestingRepId } : {}) },
      relations: { rep: true },
      order: { submittedAt: "DESC" },
      take: 10,
    });
    return { ...shop, recentOrders };
  }
  async update(id: string, input: Partial<Shop>) {
    const shop = await this.shops.findOneBy({ id });
    if (!shop) throw new NotFoundException("Shop not found");
    if (input.assignedRepId !== undefined) await this.verifyRep(input.assignedRepId);
    Object.assign(shop, input);
    await this.shops.save(shop);
    return this.shops.findOneByOrFail({ id });
  }
}
