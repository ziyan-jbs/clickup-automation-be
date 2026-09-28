import { DocumentBuilder } from "@nestjs/swagger";

export const swaggerConfig = new DocumentBuilder()
  .setTitle("ClickUp Automation API")
  .setDescription("API for ClickUp task selection, rule scheduling, and time-entry automation.")
  .setVersion("0.1.0")
  .addBearerAuth()
  .build();
