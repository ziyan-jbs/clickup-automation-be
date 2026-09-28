// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require("cookie-parser");
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require("supertest");

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { AppModule } from "@/app.module";

describe("ClickUp Automation API (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api", { exclude: ["health"] });
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => app.close());

  it("reports PostgreSQL health without requiring Redis", async () => {
    const response = await request(app.getHttpServer()).get("/health").expect(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.services.database).toBe("up");
    expect(["up", "down", "disabled"]).toContain(response.body.services.redis);
  });

  it.each(["/api/tasks", "/api/automation-rules", "/api/audit/runs", "/api/dashboard", "/api/settings", "/api/clickup/workspaces"])(
    "protects %s with bearer authentication",
    async (path) => {
      const response = await request(app.getHttpServer()).get(path).expect(401);
      expect(response.body.message).toBe("Missing access token");
      expect(response.body.requestId).toEqual(expect.any(String));
    },
  );

  it("rejects refresh requests without the HttpOnly refresh cookie", async () => {
    await request(app.getHttpServer()).post("/api/auth/refresh").expect(401);
  });

  it("protects the scheduler trigger with the internal API key", async () => {
    await request(app.getHttpServer()).post("/api/job-trigger/time-entry-sync").expect(401);
  });
});
