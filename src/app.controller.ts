import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse } from "@nestjs/swagger";
import { HealthResponseDto } from "@/swagger/api-response.dto";
@Controller()
export class AppController {
  @ApiOkResponse({ type: HealthResponseDto })
  @Get("health")
  health(): { status: string } {
    return { status: "ok" };
  }
}
