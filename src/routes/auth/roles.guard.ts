import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@/entities/user.entity";
import { ROLES_KEY } from "@/routes/auth/roles.decorator";
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles) return true;
    if (!roles.includes(context.switchToHttp().getRequest().user?.role))
      throw new ForbiddenException("Insufficient role");
    return true;
  }
}
