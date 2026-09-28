import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "@/entities/user.entity";
import { AuthController } from "@/routes/auth/auth.controller";
import { AuthService } from "@/routes/auth/auth.service";
import { JwtAuthGuard } from "@/routes/auth/jwt-auth.guard";
import { RolesGuard } from "@/routes/auth/roles.guard";
@Module({ imports: [TypeOrmModule.forFeature([User]), JwtModule.registerAsync({ imports: [ConfigModule], inject: [ConfigService], useFactory: (config: ConfigService) => ({ secret: config.get<string>("security.jwtAccessSecret") }) })], controllers: [AuthController], providers: [AuthService, JwtAuthGuard, RolesGuard], exports: [JwtAuthGuard, RolesGuard, JwtModule] }) export class AuthModule {}
