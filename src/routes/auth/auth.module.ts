import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerModule } from "@nestjs/throttler";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthSession, ClickUpConnection, ClickUpWorkspace, User, UserPreference } from "@/entities";
import { AuthController } from "@/routes/auth/auth.controller";
import { AuthService } from "@/routes/auth/auth.service";
import { JwtAuthGuard } from "@/routes/auth/jwt-auth.guard";

@Module({
  imports: [
    JwtModule.register({}),
    ThrottlerModule.forRoot([{ ttl: 15 * 60_000, limit: 5 }]),
    TypeOrmModule.forFeature([User, AuthSession, UserPreference, ClickUpConnection, ClickUpWorkspace]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
