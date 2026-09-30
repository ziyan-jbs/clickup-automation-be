import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DataSource, In, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Product } from "@/entities/product.entity";
import { Shop, ShopApprovalStatus } from "@/entities/shop.entity";
import { Order, OrderStatus } from "@/entities/order.entity";
import { OrderLine } from "@/entities/order-line.entity";
import { OrderStatusEvent } from "@/entities/order-status-event.entity";
import { UserRole } from "@/entities/user.entity";
import { AuthenticatedUser } from "@/routes/auth/auth.types";
import { AcceptOrderDto, CreateOrderDto, DeliverOrderDto, OrderQuery } from "@/routes/orders/orders.dto";
@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
  ) {}
  async submit(user: AuthenticatedUser, input: CreateOrderDto) {
    if (user.role !== UserRole.SALES_REP)
      throw new ForbiddenException("Only sales representatives can submit orders");
    const productQuantities = new Map<string, number>();
    for (const line of input.lines) {
      const quantity = (productQuantities.get(line.productId) || 0) + line.orderedBoxes;
      if (!Number.isSafeInteger(quantity))
        throw new BadRequestException("Box quantity is too large");
      productQuantities.set(line.productId, quantity);
    }
    const result = await this.dataSource.transaction(async (manager) => {
      // Serializes retries, including simultaneous mobile double taps.
      await manager.query("SELECT pg_advisory_xact_lock(hashtext($1))", [input.idempotencyKey]);
      const existing = await manager.getRepository(Order).findOne({
        where: { idempotencyKey: input.idempotencyKey },
        relations: { lines: true },
      });
      if (existing) {
        const sameLines =
          existing.lines.length === productQuantities.size &&
          existing.lines.every(
            (line) => productQuantities.get(line.productId) === line.orderedBoxes,
          );
        if (
          existing.repId !== user.id ||
          existing.shopId !== input.shopId ||
          existing.notes !== (input.notes || null) ||
          !sameLines
        )
          throw new ConflictException("Idempotency key was used for a different order");
        return existing.id;
      }
      const shop = await manager.getRepository(Shop).findOneBy({ id: input.shopId });
      if (!shop || !shop.isActive || shop.approvalStatus !== ShopApprovalStatus.APPROVED || shop.assignedRepId !== user.id)
        throw new ForbiddenException("Shop is inactive or not assigned to you");
      const productList = await manager
        .getRepository(Product)
        .findBy({ id: In([...productQuantities.keys()]), isActive: true });
      if (productList.length !== productQuantities.size)
        throw new BadRequestException("One or more products are unknown or inactive");
      const productMap = new Map(productList.map((product) => [product.id, product]));
      const lines = [...productQuantities.entries()].map(([productId, orderedBoxes]) => {
        const product = productMap.get(productId)!;
        const lineTotal = product.pricePerBoxMinor * orderedBoxes;
        if (!Number.isSafeInteger(lineTotal) || lineTotal > 2147483647)
          throw new BadRequestException("Order line value is too large");
        return manager.create(OrderLine, {
          productId,
          orderedBoxes,
          acceptedBoxes: 0,
          deliveredBoxes: 0,
          unitPriceMinor: product.pricePerBoxMinor,
          productName: product.name,
          productSku: product.sku,
          unitsPerBox: product.unitsPerBox,
          orderedLineTotalMinor: lineTotal,
          deliveredLineTotalMinor: 0,
        });
      });
      const orderedTotalMinor = lines.reduce((sum, line) => sum + line.orderedLineTotalMinor, 0);
      if (orderedTotalMinor > 2147483647) throw new BadRequestException("Order value is too large");
      const order = manager.create(Order, {
        shopId: shop.id,
        repId: user.id,
        status: OrderStatus.SUBMITTED,
        currency: "PKR",
        notes: input.notes || null,
        idempotencyKey: input.idempotencyKey,
        submittedAt: new Date(),
        orderedTotalMinor,
        deliveredTotalMinor: 0,
        acceptedAt: null,
        pickedUpAt: null,
        deliveredAt: null,
      });
      await manager.save(order);
      for (const line of lines) line.orderId = order.id;
      await manager.save(lines);
      await manager.save(
        manager.create(OrderStatusEvent, {
          orderId: order.id,
          previousStatus: null,
          newStatus: OrderStatus.SUBMITTED,
          actorId: user.id,
          reason: "Order submitted",
        }),
      );
      return order.id;
    });
    return this.get(result, user);
  }
  async list(user: AuthenticatedUser, query: OrderQuery) {
    const { page = 1, limit = 25 } = query;
    const qb = this.orders
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.shop", "shop")
      .leftJoinAndSelect("order.rep", "rep")
      .orderBy("order.submittedAt", "DESC");
    if (user.role === UserRole.SALES_REP) qb.andWhere("order.repId = :userId", { userId: user.id });
    if (query.status) qb.andWhere("order.status = :status", { status: query.status });
    if (query.shopId) qb.andWhere("order.shopId = :shopId", { shopId: query.shopId });
    if (query.repId && user.role !== UserRole.SALES_REP)
      qb.andWhere("order.repId = :repId", { repId: query.repId });
    if (query.from) qb.andWhere("order.submittedAt >= :from", { from: query.from });
    if (query.to)
      qb.andWhere("order.submittedAt < (:to::date + interval '1 day')", { to: query.to });
    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items, total, page, limit };
  }
  async get(id: string, user: AuthenticatedUser) {
    const order = await this.orders.findOne({
      where: { id },
      relations: { shop: true, rep: true, lines: true, statusEvents: { actor: true } },
      order: { statusEvents: { createdAt: "ASC" } },
    });
    if (!order) throw new NotFoundException("Order not found");
    if (user.role === UserRole.SALES_REP && order.repId !== user.id)
      throw new ForbiddenException("You may only view your own orders");
    return this.detail(order);
  }
  async accept(id: string, actor: AuthenticatedUser, input: AcceptOrderDto) {
    await this.dataSource.transaction(async (manager) => {
      const order = await manager
        .getRepository(Order)
        .findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!order) throw new NotFoundException("Order not found");
      if (order.status !== OrderStatus.SUBMITTED)
        throw new ConflictException("Only submitted orders can be accepted");
      const lines = await manager.getRepository(OrderLine).findBy({ orderId: id });
      const accepted = new Map(input.lines.map((line) => [line.lineId, line.acceptedBoxes]));
      if (accepted.size !== input.lines.length || accepted.size !== lines.length || lines.some((line) => !accepted.has(line.id)))
        throw new BadRequestException("Accepted quantities are required for every order line exactly once");
      if (lines.every((line) => accepted.get(line.id) === 0))
        throw new BadRequestException("At least one box must be accepted; cancel an unavailable order");
      // Lock products in a stable order so concurrent acceptances cannot oversell inventory.
      const products = await manager.getRepository(Product).createQueryBuilder("product")
        .where("product.id IN (:...ids)", { ids: lines.map((line) => line.productId) })
        .orderBy("product.id", "ASC").setLock("pessimistic_write").getMany();
      const stock = new Map(products.map((product) => [product.id, product]));
      for (const line of lines) {
        const boxes = accepted.get(line.id)!;
        if (boxes > line.orderedBoxes) throw new BadRequestException("Accepted boxes cannot exceed ordered boxes");
        const product = stock.get(line.productId);
        if (!product || product.availableBoxes < boxes)
          throw new ConflictException(`Insufficient stock for ${line.productName}`);
        product.availableBoxes -= boxes;
        line.acceptedBoxes = boxes;
      }
      await manager.save(products);
      await manager.save(lines);
      order.status = OrderStatus.ACCEPTED;
      order.acceptedAt = new Date();
      await manager.save(order);
      await manager.save(
        manager.create(OrderStatusEvent, {
          orderId: id,
          previousStatus: OrderStatus.SUBMITTED,
          newStatus: OrderStatus.ACCEPTED,
          actorId: actor.id,
          reason: null,
        }),
      );
    });
    return this.get(id, actor);
  }
  async pickup(id: string, actor: AuthenticatedUser) {
    await this.dataSource.transaction(async (manager) => {
      const order = await manager.getRepository(Order).findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!order) throw new NotFoundException("Order not found");
      if (actor.role === UserRole.SALES_REP && order.repId !== actor.id)
        throw new ForbiddenException("You may only pick up your own orders");
      if (order.status !== OrderStatus.ACCEPTED)
        throw new ConflictException("Only accepted orders can be picked up");
      order.status = OrderStatus.PICKED_UP;
      order.pickedUpAt = new Date();
      await manager.save(order);
      await manager.save(manager.create(OrderStatusEvent, { orderId: id, previousStatus: OrderStatus.ACCEPTED, newStatus: OrderStatus.PICKED_UP, actorId: actor.id, reason: null }));
    });
    return this.get(id, actor);
  }
  async deliver(id: string, actor: AuthenticatedUser, input: DeliverOrderDto) {
    await this.dataSource.transaction(async (manager) => {
      const order = await manager
        .getRepository(Order)
        .findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!order) throw new NotFoundException("Order not found");
      if (order.repId !== actor.id) throw new ForbiddenException("Only the assigned sales rep can deliver this order");
      if (order.status !== OrderStatus.PICKED_UP)
        throw new ConflictException("Only picked-up orders can be delivered");
      order.lines = await manager.getRepository(OrderLine).findBy({ orderId: id });
      const delivered = new Map(input.lines.map((line) => [line.lineId, line.deliveredBoxes]));
      if (
        delivered.size !== input.lines.length ||
        delivered.size !== order.lines.length ||
        order.lines.some((line) => !delivered.has(line.id))
      )
        throw new BadRequestException(
          "Delivered quantities are required for every order line exactly once",
        );
      let total = 0;
      let anyDelivered = false;
      let full = true;
      for (const line of order.lines) {
        const boxes = delivered.get(line.id)!;
        if (boxes > line.acceptedBoxes)
          throw new BadRequestException("Delivered boxes cannot exceed accepted boxes");
        line.deliveredBoxes = boxes;
        line.deliveredLineTotalMinor = boxes * line.unitPriceMinor;
        total += line.deliveredLineTotalMinor;
        anyDelivered ||= boxes > 0;
        full &&= boxes === line.orderedBoxes;
      }
      if (!anyDelivered)
        throw new BadRequestException("Zero-box delivery must be cancelled with a reason instead");
      order.deliveredTotalMinor = total;
      order.deliveredAt = new Date();
      order.status = full ? OrderStatus.DELIVERED : OrderStatus.PARTIALLY_DELIVERED;
      await manager.save(order.lines);
      await manager.save(order);
      await manager.save(
        manager.create(OrderStatusEvent, {
          orderId: id,
          previousStatus: OrderStatus.PICKED_UP,
          newStatus: order.status,
          actorId: actor.id,
          reason: input.note || null,
        }),
      );
    });
    return this.get(id, actor);
  }
  async cancel(id: string, actor: AuthenticatedUser, reason: string) {
    await this.dataSource.transaction(async (manager) => {
      const order = await manager
        .getRepository(Order)
        .findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!order) throw new NotFoundException("Order not found");
      if (![OrderStatus.SUBMITTED, OrderStatus.ACCEPTED].includes(order.status))
        throw new ConflictException("Only submitted or accepted orders can be cancelled");
      const previousStatus = order.status;
      if (previousStatus === OrderStatus.ACCEPTED) {
        const lines = await manager.getRepository(OrderLine).findBy({ orderId: id });
        const products = await manager.getRepository(Product).createQueryBuilder("product")
          .where("product.id IN (:...ids)", { ids: lines.map((line) => line.productId) })
          .orderBy("product.id", "ASC").setLock("pessimistic_write").getMany();
        const quantities = new Map(lines.map((line) => [line.productId, line.acceptedBoxes]));
        for (const product of products) product.availableBoxes += quantities.get(product.id) || 0;
        await manager.save(products);
      }
      order.status = OrderStatus.CANCELLED;
      await manager.save(order);
      await manager.save(
        manager.create(OrderStatusEvent, {
          orderId: id,
          previousStatus,
          newStatus: OrderStatus.CANCELLED,
          actorId: actor.id,
          reason,
        }),
      );
    });
    return this.get(id, actor);
  }
  private detail(order: Order) {
    return order;
  }
}
