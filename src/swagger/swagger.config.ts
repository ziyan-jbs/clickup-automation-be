import { DocumentBuilder } from "@nestjs/swagger";
export const swaggerConfig = new DocumentBuilder().setTitle("Field Sales API").setDescription("Order taking and delivery workflow for food distribution.").setVersion("1.0.0").addBearerAuth().build();
