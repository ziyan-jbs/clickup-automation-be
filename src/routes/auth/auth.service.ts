import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as argon2 from "argon2";
import { Repository } from "typeorm";
import { User } from "@/entities/user.entity";
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}
  async login(email: string, password: string) {
    const user = await this.users
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("LOWER(user.email) = LOWER(:email)", { email })
      .getOne();
    if (!user || !user.isActive || !(await argon2.verify(user.passwordHash, password)))
      throw new UnauthorizedException("Invalid email or password");
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role },
      {
        issuer: this.config.get("security.jwtIssuer"),
        audience: this.config.get("security.jwtAudience"),
        expiresIn: this.config.get("security.accessTokenTtl"),
      },
    );
    return { accessToken, tokenType: "Bearer", user: this.serialize(user) };
  }
  serialize(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      requiresShopApproval: user.requiresShopApproval,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
