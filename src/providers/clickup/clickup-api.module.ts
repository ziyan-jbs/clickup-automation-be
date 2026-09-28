import { Global, Module } from "@nestjs/common";

import { ClickUpApiClient } from "@/providers/clickup/clickup-api.client";

@Global()
@Module({
  providers: [ClickUpApiClient],
  exports: [ClickUpApiClient],
})
export class ClickUpApiModule {}
