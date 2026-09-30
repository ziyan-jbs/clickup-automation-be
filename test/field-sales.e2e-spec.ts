import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import * as argon2 from "argon2";
import * as request from "supertest";
import { DataSource } from "typeorm";
import { AppModule } from "@/app.module";
import { Order } from "@/entities/order.entity";
import { Product } from "@/entities/product.entity";
import { Shop } from "@/entities/shop.entity";
import { User, UserRole } from "@/entities/user.entity";

describe("field sales journey against PostgreSQL", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let db: DataSource;
  let admin: User;
  let rep: User;
  let otherRep: User;
  let shop: Shop;
  let otherShop: Shop;
  let biscuits: Product;
  let juice: Product;
  const requestedShopIds: string[] = [];
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const password = `Test-${suffix}`;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix("api", { exclude: ["health"] });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    db = app.get(DataSource);
    const hash = await argon2.hash(password);
    const users = db.getRepository(User);
    admin = await users.save(
      users.create({
        email: `admin-${suffix}@test.invalid`,
        name: "Test Admin",
        passwordHash: hash,
        role: UserRole.ADMIN,
        isActive: true,
      }),
    );
    rep = await users.save(
      users.create({
        email: `rep-${suffix}@test.invalid`,
        name: "Test Rep",
        passwordHash: hash,
        role: UserRole.SALES_REP,
        isActive: true,
      }),
    );
    otherRep = await users.save(
      users.create({
        email: `other-${suffix}@test.invalid`,
        name: "Other Rep",
        passwordHash: hash,
        role: UserRole.SALES_REP,
        isActive: true,
      }),
    );
    const shops = db.getRepository(Shop);
    shop = await shops.save(
      shops.create({
        name: `Test Shop ${suffix}`,
        area: "Test Area",
        assignedRepId: rep.id,
        isActive: true,
      }),
    );
    otherShop = await shops.save(
      shops.create({
        name: `Other Shop ${suffix}`,
        area: "Test Area",
        assignedRepId: otherRep.id,
        isActive: true,
      }),
    );
    const products = db.getRepository(Product);
    biscuits = await products.save(
      products.create({
        sku: `BIS-${suffix}`,
        name: "Test Biscuits",
        pricePerBoxMinor: 45000,
        unitsPerBox: 24,
        availableBoxes: 10,
        isActive: true,
      }),
    );
    juice = await products.save(
      products.create({
        sku: `JUI-${suffix}`,
        name: "Test Juice",
        pricePerBoxMinor: 72000,
        unitsPerBox: 12,
        availableBoxes: 10,
        isActive: true,
      }),
    );
  });

  afterAll(async () => {
    if (db?.isInitialized) {
      await db.getRepository(Order).delete({ repId: rep?.id });
      await db.getRepository(Shop).delete([shop?.id, otherShop?.id, ...requestedShopIds]);
      await db.getRepository(Product).delete([biscuits?.id, juice?.id]);
      await db.getRepository(User).delete([admin?.id, rep?.id, otherRep?.id]);
    }
    if (app) await app.close();
  });

  it("enforces assignment, snapshots, idempotency, delivery, and historical reporting", async () => {
    const server = app.getHttpServer();
    const login = async (email: string) => {
      const response = await request(server)
        .post("/api/auth/login")
        .send({ email, password })
        .expect(201);
      return `Bearer ${response.body.accessToken}`;
    };
    const repToken = await login(rep.email);
    const adminToken = await login(admin.email);
    await db.getRepository(User).update(rep.id, { isActive: false });
    await request(server).get("/api/shops").set("Authorization", repToken).expect(401);
    await request(server).post("/api/auth/login").send({ email: rep.email, password }).expect(401);
    await db.getRepository(User).update(rep.id, { isActive: true });
    await db.getRepository(Product).update(juice.id, { isActive: false });
    await request(server)
      .get(`/api/products/${juice.id}`)
      .set("Authorization", repToken)
      .expect(404);
    await db.getRepository(Product).update(juice.id, { isActive: true });
    const lines = [
      { productId: biscuits.id, orderedBoxes: 4, unitPriceMinor: 1 },
      { productId: juice.id, orderedBoxes: 6, unitPriceMinor: 1 },
    ];
    await request(server)
      .post("/api/orders")
      .set("Authorization", repToken)
      .send({ shopId: otherShop.id, idempotencyKey: `${suffix}-wrong-shop`, lines })
      .expect(403);
    const body = { shopId: shop.id, idempotencyKey: `${suffix}-order`, lines };
    const [submitted, simultaneousRetry] = await Promise.all([
      request(server).post("/api/orders").set("Authorization", repToken).send(body).expect(201),
      request(server).post("/api/orders").set("Authorization", repToken).send(body).expect(201),
    ]);
    expect(simultaneousRetry.body.id).toBe(submitted.body.id);
    expect(submitted.body.orderedTotalMinor).toBe(612000);
    expect(submitted.body.repId).toBe(rep.id);
    expect(
      submitted.body.lines.find((line: { productId: string }) => line.productId === juice.id)
        .unitPriceMinor,
    ).toBe(72000);
    const retry = await request(server)
      .post("/api/orders")
      .set("Authorization", repToken)
      .send(body)
      .expect(201);
    expect(retry.body.id).toBe(submitted.body.id);
    await request(server)
      .post("/api/orders")
      .set("Authorization", repToken)
      .send({ ...body, lines: [{ productId: juice.id, orderedBoxes: 1 }] })
      .expect(409);
    const deliveryLines = submitted.body.lines.map(
      (line: { id: string; productId: string; orderedBoxes: number }) => ({
        lineId: line.id,
        deliveredBoxes: line.productId === juice.id ? 4 : line.orderedBoxes,
      }),
    );
    await request(server)
      .patch(`/api/orders/${submitted.body.id}/delivery`)
      .set("Authorization", repToken)
      .send({ lines: deliveryLines })
      .expect(409);
    await request(server)
      .patch(`/api/orders/${submitted.body.id}/accept`)
      .set("Authorization", adminToken)
      .send({ lines: submitted.body.lines.map((line: { id: string; orderedBoxes: number }) => ({ lineId: line.id, acceptedBoxes: line.orderedBoxes })) })
      .expect(200);
    expect((await db.getRepository(Product).findOneByOrFail({ id: biscuits.id })).availableBoxes).toBe(6);
    expect((await db.getRepository(Product).findOneByOrFail({ id: juice.id })).availableBoxes).toBe(4);
    const secondOrder = await request(server).post("/api/orders").set("Authorization", repToken)
      .send({ shopId: shop.id, idempotencyKey: `${suffix}-reserve`, lines: [{ productId: biscuits.id, orderedBoxes: 7 }] }).expect(201);
    await request(server).patch(`/api/orders/${secondOrder.body.id}/accept`).set("Authorization", adminToken)
      .send({ lines: [{ lineId: secondOrder.body.lines[0].id, acceptedBoxes: 7 }] }).expect(409);
    await request(server).patch(`/api/orders/${secondOrder.body.id}/accept`).set("Authorization", adminToken)
      .send({ lines: [{ lineId: secondOrder.body.lines[0].id, acceptedBoxes: 2 }] }).expect(200);
    expect((await db.getRepository(Product).findOneByOrFail({ id: biscuits.id })).availableBoxes).toBe(4);
    await request(server).patch(`/api/orders/${secondOrder.body.id}/cancel`).set("Authorization", adminToken)
      .send({ reason: "Stock returned before pickup" }).expect(200);
    expect((await db.getRepository(Product).findOneByOrFail({ id: biscuits.id })).availableBoxes).toBe(6);
    await request(server).patch(`/api/orders/${submitted.body.id}/pickup`).set("Authorization", repToken).expect(200);
    await request(server)
      .patch(`/api/orders/${submitted.body.id}/delivery`)
      .set("Authorization", repToken)
      .send({ lines: [deliveryLines[0], deliveryLines[0]] })
      .expect(400);
    const delivered = await request(server)
      .patch(`/api/orders/${submitted.body.id}/delivery`)
      .set("Authorization", repToken)
      .send({ lines: deliveryLines })
      .expect(200);
    expect(delivered.body.status).toBe("PARTIALLY_DELIVERED");
    expect(delivered.body.deliveredTotalMinor).toBe(468000);
    expect(
      delivered.body.lines.find((line: { productId: string }) => line.productId === juice.id),
    ).toMatchObject({ orderedBoxes: 6, deliveredBoxes: 4 });
    await request(server)
      .patch(`/api/orders/${submitted.body.id}/delivery`)
      .set("Authorization", repToken)
      .send({ lines: deliveryLines })
      .expect(409);
    const productsReport = await request(server)
      .get(`/api/reports/products?shopId=${shop.id}`)
      .set("Authorization", adminToken)
      .expect(200);
    expect(
      productsReport.body.items.find((row: { productId: string }) => row.productId === juice.id)
        .deliveredBoxes,
    ).toBe(4);
    await request(server)
      .patch(`/api/shops/${shop.id}/assignment`)
      .set("Authorization", adminToken)
      .send({ assignedRepId: otherRep.id })
      .expect(200);
    const historicalOrder = await request(server)
      .get(`/api/orders/${submitted.body.id}`)
      .set("Authorization", repToken)
      .expect(200);
    expect(historicalOrder.body.repId).toBe(rep.id);
    await request(server).get(`/api/shops/${shop.id}`).set("Authorization", repToken).expect(403);
    const repsReport = await request(server)
      .get(`/api/reports/reps?shopId=${shop.id}`)
      .set("Authorization", adminToken)
      .expect(200);
    expect(repsReport.body.items[0].id).toBe(rep.id);
  });
  it("requires approval for one rep and lets an authorized rep add shops directly", async () => {
    const server = app.getHttpServer();
    const login = async (email: string) => {
      const response = await request(server).post("/api/auth/login").send({ email, password }).expect(201);
      return `Bearer ${response.body.accessToken}`;
    };
    const repToken = await login(rep.email);
    const adminToken = await login(admin.email);
    const pending = await request(server).post("/api/shops/requests").set("Authorization", repToken)
      .send({ name: `Pending ${suffix}`, area: "Test Area", assignedRepId: otherRep.id }).expect(201);
    requestedShopIds.push(pending.body.id);
    expect(pending.body).toMatchObject({ assignedRepId: rep.id, approvalStatus: "PENDING", isActive: false });
    await request(server).post("/api/orders").set("Authorization", repToken)
      .send({ shopId: pending.body.id, idempotencyKey: `${suffix}-pending`, lines: [{ productId: biscuits.id, orderedBoxes: 1 }] }).expect(403);
    const approved = await request(server).patch(`/api/shops/${pending.body.id}/approval`).set("Authorization", adminToken)
      .send({ approvalStatus: "APPROVED" }).expect(200);
    expect(approved.body).toMatchObject({ approvalStatus: "APPROVED", isActive: true });
    await db.getRepository(User).update(otherRep.id, { requiresShopApproval: false });
    const otherToken = await login(otherRep.email);
    const direct = await request(server).post("/api/shops/requests").set("Authorization", otherToken)
      .send({ name: `Direct ${suffix}`, area: "Test Area" }).expect(201);
    requestedShopIds.push(direct.body.id);
    expect(direct.body).toMatchObject({ assignedRepId: otherRep.id, approvalStatus: "APPROVED", isActive: true });
  });
});
