import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthService } from "@/routes/auth/auth.service";
import { LoginDto } from "@/routes/auth/dto/login.dto";
import { JwtAuthGuard } from "@/routes/auth/jwt-auth.guard";
import { CurrentUser } from "@/routes/auth/current-user.decorator";
import { AuthenticatedUser } from "@/routes/auth/auth.types";
@ApiTags("Authentication") @Controller("auth") export class AuthController { constructor(private readonly auth: AuthService) {} @Post("login") login(@Body() body: LoginDto) { return this.auth.login(body.email, body.password); } @Get("me") @ApiBearerAuth() @UseGuards(JwtAuthGuard) me(@CurrentUser() user: AuthenticatedUser) { return user; } }
