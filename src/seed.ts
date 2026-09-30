import * as argon2 from "argon2";
import dataSource from "@/providers/db/postgres.provider";
import { User, UserRole } from "@/entities/user.entity";
import { Product } from "@/entities/product.entity";
import { Shop } from "@/entities/shop.entity";
import { Order, OrderStatus } from "@/entities/order.entity";
import { OrderLine } from "@/entities/order-line.entity";
import { OrderStatusEvent } from "@/entities/order-status-event.entity";

async function seed(): Promise<void> {
  const password = process.env.DEMO_PASSWORD;
  if (!password) throw new Error("DEMO_PASSWORD is required to seed demo users");
  await dataSource.initialize();
  await dataSource.runMigrations();
  const users = dataSource.getRepository(User);
  const products = dataSource.getRepository(Product);
  const shops = dataSource.getRepository(Shop);
  const orders = dataSource.getRepository(Order);
  const putUser = async (email: string, name: string, role: UserRole) =>
    users.save(
      users.create({
        ...(await users.findOneBy({ email })),
        email,
        name,
        passwordHash: await argon2.hash(password),
        role,
        isActive: true,
      }),
    );
  await putUser("superadmin@demo.test", "Super Admin", UserRole.SUPER_ADMIN);
  const admin = await putUser("admin@demo.test", "Ayesha Khan", UserRole.ADMIN);
  const ali = await putUser("rep.ali@demo.test", "Ali Raza", UserRole.SALES_REP);
  const sara = await putUser("rep.sara@demo.test", "Sara Ahmed", UserRole.SALES_REP);
  const source = [
    ["BIS-001", "Butter Biscuits", "Biscuits", 45000, 24],
    ["JUI-001", "Mango Juice", "Beverages", 72000, 12],
    ["JUI-002", "Orange Juice", "Beverages", 68000, 12],
    ["SNA-001", "Masala Chips", "Snacks", 35000, 30],
    ["SNA-002", "Salted Crackers", "Snacks", 42000, 20],
    ["SAU-001", "Tomato Ketchup", "Condiments", 56000, 12],
    ["CER-001", "Chocolate Cereal", "Breakfast", 89000, 10],
    ["TEA-001", "Tea Rusks", "Bakery", 39000, 24],
    ["NOD-001", "Instant Noodles", "Pantry", 30000, 24],
    ["MIL-001", "UHT Milk", "Dairy", 66000, 12],
  ] as const;
  const catalog = new Map<string, Product>();
  for (const [sku, name, category, pricePerBoxMinor, unitsPerBox] of source) {
    const existing = await products.findOneBy({ sku });
    catalog.set(
      sku,
      await products.save(
        products.create({
          ...existing,
          sku,
          name,
          category,
          pricePerBoxMinor,
          unitsPerBox,
          availableBoxes: 1000,
          isActive: true,
        }),
      ),
    );
  }
  const sourceShops = [
    ["Al-Habib Mart", "Gulshan", ali],
    ["City Super Store", "Gulshan", ali],
    ["Madina General Store", "PECHS", ali],
    ["Fresh Basket", "DHA", ali],
    ["Naveed Kiryana", "North Nazimabad", ali],
    ["Daily Needs", "Clifton", sara],
    ["Sajjad Traders", "Clifton", sara],
    ["Family Mart", "Defence View", sara],
    ["Bismillah Store", "Korangi", sara],
    ["Metro Mini Mart", "Shah Faisal", sara],
  ] as const;
  const seededShops: Shop[] = [];
  for (const [name, area, rep] of sourceShops)
    seededShops.push(
      await shops.save(
        shops.create({
          ...(await shops.findOneBy({ name })),
          name,
          area,
          contactPerson: "Shop owner",
          phone: "0300-0000000",
          address: `${area}, Karachi`,
          assignedRepId: rep.id,
          isActive: true,
        }),
      ),
    );
  const makeOrder = async (
    key: string,
    shop: Shop,
    rep: User,
    status: OrderStatus,
    lineInput: Array<[string, number, number]>,
    daysAgo: number,
  ) => {
    if (await orders.exist({ where: { idempotencyKey: key } })) return;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const lines = lineInput.map(([sku, orderedBoxes, deliveredBoxes]) => {
      const product = catalog.get(sku)!;
      return dataSource.manager.create(OrderLine, {
        productId: product.id,
        orderedBoxes,
        acceptedBoxes: status === OrderStatus.SUBMITTED ? 0 : orderedBoxes,
        deliveredBoxes,
        unitPriceMinor: product.pricePerBoxMinor,
        productName: product.name,
        productSku: product.sku,
        unitsPerBox: product.unitsPerBox,
        orderedLineTotalMinor: orderedBoxes * product.pricePerBoxMinor,
        deliveredLineTotalMinor: deliveredBoxes * product.pricePerBoxMinor,
      });
    });
    const order = dataSource.manager.create(Order, {
      shopId: shop.id,
      repId: rep.id,
      status,
      currency: "PKR",
      idempotencyKey: key,
      submittedAt: date,
      acceptedAt: [
        OrderStatus.ACCEPTED,
        OrderStatus.DELIVERED,
        OrderStatus.PARTIALLY_DELIVERED,
      ].includes(status)
        ? date
        : null,
      pickedUpAt: [OrderStatus.DELIVERED, OrderStatus.PARTIALLY_DELIVERED].includes(status) ? date : null,
      deliveredAt: [OrderStatus.DELIVERED, OrderStatus.PARTIALLY_DELIVERED].includes(status)
        ? date
        : null,
      orderedTotalMinor: lines.reduce((sum, line) => sum + line.orderedLineTotalMinor, 0),
      deliveredTotalMinor: lines.reduce((sum, line) => sum + line.deliveredLineTotalMinor, 0),
      notes: null,
    });
    await dataSource.manager.save(order);
    for (const line of lines) line.orderId = order.id;
    await dataSource.manager.save(lines);
    await dataSource.manager.save(
      dataSource.manager.create(OrderStatusEvent, {
        orderId: order.id,
        previousStatus: null,
        newStatus: OrderStatus.SUBMITTED,
        actorId: rep.id,
        reason: "Seeded order",
      }),
    );
    if (
      [OrderStatus.ACCEPTED, OrderStatus.DELIVERED, OrderStatus.PARTIALLY_DELIVERED].includes(
        status,
      )
    )
      await dataSource.manager.save(
        dataSource.manager.create(OrderStatusEvent, {
          orderId: order.id,
          previousStatus: OrderStatus.SUBMITTED,
          newStatus: OrderStatus.ACCEPTED,
          actorId: admin.id,
          reason: "Seeded acceptance",
        }),
      );
    if (
      [OrderStatus.DELIVERED, OrderStatus.PARTIALLY_DELIVERED, OrderStatus.CANCELLED].includes(
        status,
      )
    )
      if (status !== OrderStatus.CANCELLED)
        await dataSource.manager.save(dataSource.manager.create(OrderStatusEvent, {
          orderId: order.id, previousStatus: OrderStatus.ACCEPTED,
          newStatus: OrderStatus.PICKED_UP, actorId: rep.id, reason: "Seeded pickup",
        }));
    if ([OrderStatus.DELIVERED, OrderStatus.PARTIALLY_DELIVERED, OrderStatus.CANCELLED].includes(status))
      await dataSource.manager.save(
        dataSource.manager.create(OrderStatusEvent, {
          orderId: order.id,
          previousStatus:
            status === OrderStatus.CANCELLED ? OrderStatus.SUBMITTED : OrderStatus.PICKED_UP,
          newStatus: status,
          actorId: admin.id,
          reason: status === OrderStatus.CANCELLED ? "Customer cancelled" : "Seeded delivery",
        }),
      );
  };
  await makeOrder(
    "seed-delivered-1",
    seededShops[0],
    ali,
    OrderStatus.DELIVERED,
    [
      ["BIS-001", 4, 4],
      ["JUI-001", 6, 6],
    ],
    12,
  );
  await makeOrder(
    "seed-partial-juice",
    seededShops[1],
    ali,
    OrderStatus.PARTIALLY_DELIVERED,
    [
      ["JUI-001", 6, 4],
      ["SNA-001", 3, 3],
    ],
    8,
  );
  await makeOrder(
    "seed-delivered-2",
    seededShops[5],
    sara,
    OrderStatus.DELIVERED,
    [
      ["NOD-001", 5, 5],
      ["MIL-001", 2, 2],
    ],
    6,
  );
  await makeOrder(
    "seed-accepted",
    seededShops[6],
    sara,
    OrderStatus.ACCEPTED,
    [["SAU-001", 2, 0]],
    2,
  );
  await makeOrder(
    "seed-submitted",
    seededShops[2],
    ali,
    OrderStatus.SUBMITTED,
    [["CER-001", 1, 0]],
    1,
  );
  await makeOrder(
    "seed-cancelled",
    seededShops[8],
    sara,
    OrderStatus.CANCELLED,
    [["TEA-001", 4, 0]],
    4,
  );
  console.log("Seed complete. Demo users use the configured DEMO_PASSWORD.");
  await dataSource.destroy();
}
void seed().catch(async (error) => {
  console.error(error);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exitCode = 1;
});
