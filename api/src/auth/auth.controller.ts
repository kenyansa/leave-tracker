import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService, REFRESH_TTL_MS } from './auth.service';
import { Public } from './decorators';
import { LoginDto, RegisterDto } from './dto/auth.dto';

const REFRESH_COOKIE = 'refresh_token';

@Controller('auth')
export class AuthController {
  private readonly cookieOptions: CookieOptions;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService,
  ) {
    this.cookieOptions = {
      httpOnly: true,
      sameSite: 'strict',
      secure: config.get('COOKIE_SECURE') === 'true',
      path: '/auth',
    };
  }

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.respondWithTokens(res, await this.auth.login(dto));
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.respondWithTokens(res, await this.auth.refresh(this.refreshCookie(req)));
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(this.refreshCookie(req));
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions);
  }

  private refreshCookie(req: Request) {
    const prefix = `${REFRESH_COOKIE}=`;
    return req.headers.cookie
      ?.split('; ')
      .find((cookie) => cookie.startsWith(prefix))
      ?.slice(prefix.length);
  }

  private respondWithTokens(
    res: Response,
    { accessToken, refreshToken }: { accessToken: string; refreshToken: string },
  ) {
    res.cookie(REFRESH_COOKIE, refreshToken, { ...this.cookieOptions, maxAge: REFRESH_TTL_MS });
    return { accessToken };
  }
}