import "reflect-metadata";

import helmet from "helmet";
// CommonJS export; a default import is undefined with this compiler configuration.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require("cookie-parser");
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";

import { AppModule } from "@/app.module";
import { setupSwagger } from "@/swagger/swagger";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const configService = app.get(ConfigService);
  const prefix = configService.get<string>("app.prefix") || "api";
  const allowedOrigins = configService.get<string[]>("app.allowedOrigins") || [];

  app.setGlobalPrefix(prefix, {
    exclude: ["health"],
  });
  app.enableShutdownHooks();
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: allowedOrigins.length ? allowedOrigins : false,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Request-Id"],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  setupSwagger(app, configService.get<string>("app.docsPrefix") || "docs");

  await app.listen(configService.get<number>("app.port") || 4000);
}

void bootstrap();
