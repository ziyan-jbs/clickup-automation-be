import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { DataSource } from "typeorm";
import { User } from "@/entities/user.entity";
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly dataSource: DataSource,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) throw new UnauthorizedException("Bearer token is required");
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      const user = await this.dataSource.getRepository(User).findOneBy({ id: payload.sub });
      if (!user || !user.isActive)
        throw new UnauthorizedException("Account is inactive or unavailable");
      request.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        requiresShopApproval: user.requiresShopApproval,
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
