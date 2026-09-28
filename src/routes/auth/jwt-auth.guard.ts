import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

import { getRequestContext } from "@/common/context/request-context";
import { AccessTokenClaims, AuthenticatedUser } from "@/routes/auth/auth.types";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>() as Request & { user: AuthenticatedUser };
    const [scheme, token] = (request.header("authorization") || "").split(" ");
    if (scheme !== "Bearer" || !token) throw new UnauthorizedException("Missing access token");

    try {
      const claims = await this.jwtService.verifyAsync<AccessTokenClaims>(token, {
        secret: this.configService.get<string>("security.jwtAccessSecret"),
        issuer: this.configService.get<string>("security.jwtIssuer"),
        audience: this.configService.get<string>("security.jwtAudience"),
      });
      request.user = { id: claims.sub, sessionId: claims.sid, email: claims.email };
      const requestStore = getRequestContext();
      if (requestStore) requestStore.userId = claims.sub;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }
}
