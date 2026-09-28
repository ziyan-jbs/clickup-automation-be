import { INestApplication } from "@nestjs/common";
import { SwaggerModule } from "@nestjs/swagger";

import { swaggerConfig } from "@/swagger/swagger.config";

export function setupSwagger(app: INestApplication, path: string): void {
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(path, app, document);
}
