import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "node:crypto";
import { Request } from "express";

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const expected = this.configService.get<string>("security.internalApiKey") || "";
    const actual = context.switchToHttp().getRequest<Request>().header("x-internal-key") || "";
    if (!expected || expected.length !== actual.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) {
      throw new UnauthorizedException("Invalid internal API key");
    }
    return true;
  }
}
