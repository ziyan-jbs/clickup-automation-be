import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import * as request from "supertest";
import { DataSource } from "typeorm";
import { AppModule } from "@/app.module";
import { Order } from "@/entities/order.entity";
import { Product } from "@/entities/product.entity";
import { Shop } from "@/entities/shop.entity";
import { User } from "@/entities/user.entity";
import { setupSwagger } from "@/swagger/swagger";

type Schema = {
  $ref?: string;
  type?: string;
  nullable?: boolean;
  enum?: unknown[];
  format?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  allOf?: Schema[];
};

function assertSchema(
  value: unknown,
  schema: Schema,
  definitions: Record<string, Schema>,
  path: string,
): void {
  if (schema.$ref) {
    const name = schema.$ref.split("/").at(-1)!;
    return assertSchema(value, definitions[name], definitions, path);
  }
  if (value === null) {
    expect({ path, nullable: schema.nullable }).toMatchObject({ nullable: true });
    return;
  }
  if (schema.allOf) {
    for (const part of schema.allOf) assertSchema(value, part, definitions, path);
    return;
  }
  if (schema.enum) expect(schema.enum).toContain(value);
  if (schema.type === "array") {
    expect(Array.isArray(value)).toBe(true);
    for (const [index, item] of (value as unknown[]).entries())
      assertSchema(item, schema.items!, definitions, `${path}[${index}]`);
  } else if (schema.type === "object") {
    expect(value !== null && typeof value === "object" && !Array.isArray(value)).toBe(true);
    const object = value as Record<string, unknown>;
    for (const key of schema.required || []) expect(Object.hasOwn(object, key)).toBe(true);
    for (const [key, item] of Object.entries(object)) {
      expect({
        path: `${path}.${key}`,
        documented: Boolean(schema.properties?.[key]),
      }).toMatchObject({ documented: true });
      assertSchema(item, schema.properties![key], definitions, `${path}.${key}`);
    }
  } else if (schema.type === "string") {
    expect(typeof value).toBe("string");
    if (schema.format === "date-time")
      expect(Number.isNaN(Date.parse(value as string))).toBe(false);
    if (schema.format === "date") expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  } else if (schema.type === "number" || schema.type === "integer") {
    expect(typeof value).toBe("number");
    if (schema.type === "integer") expect(Number.isInteger(value)).toBe(true);
  } else if (schema.type === "boolean") {
    expect(typeof value).toBe("boolean");
  }
}

describe("OpenAPI success responses against the seeded database", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let db: DataSource;
  let spec: {
    paths: Record<
      string,
      Record<string, { responses: Record<string, { content: Record<string, { schema: Schema }> }> }>
    >;
    components: { schemas: Record<string, Schema> };
  };
  let adminToken: string;
  let repId: string | undefined;
  let shopId: string | undefined;
  let requestedShopId: string | undefined;
  const productIds: string[] = [];
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix("api", { exclude: ["health"] });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    setupSwagger(app, "docs");
    await app.init();
    db = app.get(DataSource);
    spec = (await request(app.getHttpServer()).get("/docs-json").expect(200)).body;
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "admin@demo.test", password: process.env.DEMO_PASSWORD })
      .expect(201);
    adminToken = `Bearer ${login.body.accessToken}`;
    compare(login.body, "post", "/api/auth/login", 201);
  });

  afterAll(async () => {
    if (db?.isInitialized) {
      if (repId) await db.getRepository(Order).delete({ repId });
      if (shopId) await db.getRepository(Shop).delete(shopId);
      if (requestedShopId) await db.getRepository(Shop).delete(requestedShopId);
      if (productIds.length) await db.getRepository(Product).delete(productIds);
      if (repId) await db.getRepository(User).delete(repId);
    }
    if (app) await app.close();
  });

  function compare(body: unknown, method: string, path: string, status: number): void {
    const response = spec.paths[path]?.[method]?.responses[String(status)];
    expect(response?.content?.["application/json"]?.schema).toBeDefined();
    assertSchema(
      body,
      response.content["application/json"].schema,
      spec.components.schemas,
      `${method.toUpperCase()} ${path}`,
    );
  }

  async function call(
    method: "get" | "post" | "patch",
    path: string,
    template: string,
    token = adminToken,
    body?: Record<string, unknown>,
  ) {
    const pending = request(app.getHttpServer())[method](path).set("Authorization", token);
    if (body !== undefined) pending.send(body);
    const status = method === "post" ? 201 : 200;
    const response = await pending.expect(status);
    compare(response.body, method, template, status);
    return response.body;
  }

  it("documents seeded reads and all success mutation shapes", async () => {
    await call("get", "/health", "/health");
    await call("get", "/api/auth/me", "/api/auth/me");
    await call("get", "/api/users/sales-reps", "/api/users/sales-reps");
    const products = await call("get", "/api/products?limit=2", "/api/products");
    await call("get", `/api/products/${products.items[0].id}`, "/api/products/{id}");
    const shops = await call("get", "/api/shops?limit=2", "/api/shops");
    await call("get", `/api/shops/${shops.items[0].id}`, "/api/shops/{id}");
    const orders = await call("get", "/api/orders?limit=2", "/api/orders");
    await call("get", `/api/orders/${orders.items[0].id}`, "/api/orders/{id}");
    for (const route of ["dashboard", "products", "shops", "reps", "trend"])
      await call("get", `/api/reports/${route}`, `/api/reports/${route}`);
    await call(
      "get",
      `/api/reports/shops/${shops.items[0].id}/products`,
      "/api/reports/shops/{id}/products",
    );

    const rep = await call("post", "/api/users/sales-reps", "/api/users/sales-reps", adminToken, {
      name: "Contract Rep",
      email: `contract-${suffix}@test.invalid`,
      password: `Test-${suffix}`,
    });
    repId = rep.id;
    await call(
      "patch",
      `/api/users/sales-reps/${repId}/status`,
      "/api/users/sales-reps/{id}/status",
      adminToken,
      { isActive: true },
    );
    for (const sku of [`CON-A-${suffix}`, `CON-B-${suffix}`]) {
      const product = await call("post", "/api/products", "/api/products", adminToken, {
        sku,
        name: "Contract Product",
        pricePerBoxMinor: 50000,
        unitsPerBox: 12,
        availableBoxes: 10,
      });
      productIds.push(product.id);
    }
    await call("patch", `/api/products/${productIds[0]}`, "/api/products/{id}", adminToken, {
      name: "Updated Contract Product",
    });
    const shop = await call("post", "/api/shops", "/api/shops", adminToken, {
      name: `Contract Shop ${suffix}`,
      area: "Gulshan",
      assignedRepId: repId,
      latitude: 24.8607,
      longitude: "67.0011",
    });
    shopId = shop.id;
    expect(typeof shop.latitude).toBe("string");
    await call("patch", `/api/shops/${shopId}`, "/api/shops/{id}", adminToken, {
      longitude: 67.0022,
    });
    const unassigned = await call("patch", `/api/shops/${shopId}`, "/api/shops/{id}", adminToken, {
      assignedRepId: null,
    });
    expect(unassigned.assignedRepId).toBeNull();
    const unassignedDetail = await call("get", `/api/shops/${shopId}`, "/api/shops/{id}");
    expect(unassignedDetail.assignedRep).toBeNull();
    await call(
      "patch",
      `/api/shops/${shopId}/assignment`,
      "/api/shops/{id}/assignment",
      adminToken,
      { assignedRepId: repId },
    );
    const repLogin = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: rep.email, password: `Test-${suffix}` })
      .expect(201);
    compare(repLogin.body, "post", "/api/auth/login", 201);
    const repToken = `Bearer ${repLogin.body.accessToken}`;
    await call("get", "/api/auth/me", "/api/auth/me", repToken);
    await call("get", "/api/shops", "/api/shops", repToken);
    await call("get", `/api/shops/${shopId}`, "/api/shops/{id}", repToken);
    const requestedShop = await call("post", "/api/shops/requests", "/api/shops/requests", repToken, { name: `Requested ${suffix}`, area: "Gulshan" });
    requestedShopId = requestedShop.id;
    await call("patch", `/api/shops/${requestedShopId}/approval`, "/api/shops/{id}/approval", adminToken, { approvalStatus: "APPROVED" });
    const createOrder = (key: string) =>
      call("post", "/api/orders", "/api/orders", repToken, {
        shopId,
        idempotencyKey: key,
        lines: productIds.map((productId) => ({ productId, orderedBoxes: 2 })),
      });
    const order = await createOrder(`contract-deliver-${suffix}`);
    await call("get", "/api/orders", "/api/orders", repToken);
    await call("get", `/api/orders/${order.id}`, "/api/orders/{id}", repToken);
    await call("patch", `/api/orders/${order.id}/accept`, "/api/orders/{id}/accept", adminToken, { lines: order.lines.map((line: { id: string }) => ({ lineId: line.id, acceptedBoxes: 2 })) });
    await call("patch", `/api/orders/${order.id}/pickup`, "/api/orders/{id}/pickup", repToken);
    await call(
      "patch",
      `/api/orders/${order.id}/delivery`,
      "/api/orders/{id}/delivery",
      repToken,
      {
        lines: order.lines.map((line: { id: string }) => ({ lineId: line.id, deliveredBoxes: 1 })),
      },
    );
    const cancelled = await createOrder(`contract-cancel-${suffix}`);
    await call(
      "patch",
      `/api/orders/${cancelled.id}/cancel`,
      "/api/orders/{id}/cancel",
      adminToken,
      { reason: "Contract check" },
    );
    await call("get", `/api/shops/${shopId}`, "/api/shops/{id}");
  });
});
