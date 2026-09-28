import { Body, Controller, Get, HttpCode, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { ThrottlerGuard } from "@nestjs/throttler";
import { Request, Response } from "express";

import { AuthService } from "@/routes/auth/auth.service";
import { AuthenticatedUser } from "@/routes/auth/auth.types";
import { CurrentUser } from "@/routes/auth/current-user.decorator";
import { ClickUpTokenDto } from "@/routes/auth/dto/clickup-token.dto";
import { LoginDto, SetupPasswordDto, SignupDto } from "@/routes/auth/dto/password-auth.dto";
import { JwtAuthGuard } from "@/routes/auth/jwt-auth.guard";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly configService: ConfigService) {}

  @Post("signup")
  @UseGuards(ThrottlerGuard)
  async signup(@Body() dto: SignupDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.signup(dto.email, dto.password, dto.confirmPassword, {
      ip: request.ip,
      userAgent: request.header("user-agent"),
    });
    this.setRefreshCookie(response, result.refreshToken, result.refreshExpiresAt);
    return { accessToken: result.accessToken, expiresIn: result.expiresIn };
  }

  @Post("login")
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  async login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(dto.email, dto.password, {
      ip: request.ip,
      userAgent: request.header("user-agent"),
    });
    this.setRefreshCookie(response, result.refreshToken, result.refreshExpiresAt);
    return { accessToken: result.accessToken, expiresIn: result.expiresIn };
  }

  @Get("clickup/authorize")
  async authorize(@Query("returnTo") returnTo: string | undefined, @Res() response: Response): Promise<void> {
    response.redirect(await this.authService.getAuthorizationUrl(returnTo));
  }

  @Get("clickup/callback")
  async callback(@Query("code") code: string, @Query("state") state: string, @Req() request: Request, @Res() response: Response): Promise<void> {
    const result = await this.authService.completeOAuth(code, state, { ip: request.ip, userAgent: request.header("user-agent") });
    this.setRefreshCookie(response, result.refreshToken, result.refreshExpiresAt);
    const frontendUrl = this.configService.get<string>("app.frontendUrl") || "http://localhost:5173";
    response.redirect(`${frontendUrl}/auth/callback?returnTo=${encodeURIComponent(result.returnTo)}`);
  }

  @Post("clickup/token-login")
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  async tokenLogin(@Body() dto: ClickUpTokenDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.loginWithClickUpToken(dto.apiToken, {
      ip: request.ip,
      userAgent: request.header("user-agent"),
    });
    this.setRefreshCookie(response, result.refreshToken, result.refreshExpiresAt);
    return { accessToken: result.accessToken, expiresIn: result.expiresIn };
  }

  @Post("password/setup")
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async setupPassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetupPasswordDto): Promise<void> {
    await this.authService.setupPassword(user.id, dto.password, dto.confirmPassword);
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.refresh(request.cookies?.[this.cookieName] as string | undefined, { ip: request.ip, userAgent: request.header("user-agent") });
    this.setRefreshCookie(response, result.refreshToken, result.refreshExpiresAt);
    return { accessToken: result.accessToken, expiresIn: result.expiresIn };
  }

  @Post("logout")
  @HttpCode(204)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.authService.logout(request.cookies?.[this.cookieName] as string | undefined);
    response.clearCookie(this.cookieName, { path: "/api/auth" });
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id);
  }

  private setRefreshCookie(response: Response, token: string, expires: Date): void {
    response.cookie(this.cookieName, token, {
      httpOnly: true,
      secure: this.configService.get<string>("app.environment") === "production",
      sameSite: "lax",
      path: "/api/auth",
      expires,
    });
  }

  private get cookieName(): string { return this.configService.get<string>("security.refreshCookieName") || "clickup_refresh"; }
}
