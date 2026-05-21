import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  Post,
  Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService, ChannelAppAuthBody } from './auth.service';

interface HttpResponse {
  setHeader(name: string, value: string | string[]): this;
  redirect(url: string): void;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Get('mezon')
  startMezonLogin(
    @Query('returnTo') returnTo: string | undefined,
    @Res() response: HttpResponse,
  ): void {
    const start = this.authService.createMezonOAuthStart(returnTo);
    response.setHeader('Set-Cookie', start.cookies);
    response.redirect(start.authorizationUrl);
  }

  @Get('mezon/callback')
  async completeMezonLogin(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Headers('cookie') cookieHeader: string | undefined,
    @Res() response: HttpResponse,
  ): Promise<void> {
    try {
      const result = await this.authService.completeMezonOAuth({
        code,
        state,
        cookieHeader,
      });

      response.setHeader('Set-Cookie', [
        ...this.authService.clearMezonOAuthCookies(),
        this.authService.createSessionCookie(result.sessionToken),
        this.authService.createCsrfCookie(this.authService.createCsrfToken()),
      ]);
      response.redirect(result.redirectUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Mezon OAuth callback failed: ${message}`);
      response.setHeader('Set-Cookie', this.authService.clearMezonOAuthCookies());
      response.redirect(this.authService.createLoginErrorUrl(this.getOAuthErrorCode(err)));
    }
  }

  @Post('mezon/channel-app')
  async loginWithChannelApp(
    @Body() body: ChannelAppAuthBody,
    @Res({ passthrough: true }) response: HttpResponse,
  ): Promise<unknown> {
    const result = await this.authService.authenticateChannelApp(body);
    response.setHeader('Set-Cookie', [
      this.authService.createSessionCookie(result.accessToken),
      this.authService.createCsrfCookie(this.authService.createCsrfToken()),
    ]);
    return result;
  }

  @Get('csrf')
  async getCsrfToken(
    @Headers('cookie') cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: HttpResponse,
  ) {
    const session = await this.authService.readActiveSessionFromCookie(cookieHeader);
    if (!session) {
      throw new UnauthorizedException('Not authenticated');
    }

    const csrfToken = this.authService.createCsrfToken();
    response.setHeader('Set-Cookie', this.authService.createCsrfCookie(csrfToken));
    return { success: true, csrfToken };
  }

  @Get('mezon/me')
  async getCurrentUser(@Headers('cookie') cookieHeader: string | undefined) {
    const session = await this.authService.readActiveSessionFromCookie(cookieHeader);
    if (!session) {
      throw new UnauthorizedException('Not authenticated');
    }

    return {
      success: true,
      user: {
        user_id: session.sub,
        username: session.username,
        display_name: session.displayName,
        provider: session.provider,
      },
    };
  }

  @Post('logout')
  async logout(
    @Headers('cookie') cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: HttpResponse,
  ) {
    await this.authService.revokeSessionFromCookie(cookieHeader);
    response.setHeader('Set-Cookie', [
      this.authService.clearSessionCookie(),
      this.authService.clearCsrfCookie(),
      ...this.authService.clearMezonOAuthCookies(),
    ]);
    return { success: true };
  }

  private getOAuthErrorCode(err: unknown): string {
    const message = err instanceof Error ? err.message.toLowerCase() : '';
    if (err instanceof BadRequestException) {
      return 'mezon_callback';
    }
    if (err instanceof UnauthorizedException) {
      if (message.includes('state')) return 'mezon_state';
      if (message.includes('token')) return 'mezon_token';
      if (message.includes('unavailable')) return 'mezon_unreachable';
      if (message.includes('user')) return 'mezon_user';
    }
    return 'mezon_failed';
  }
}
