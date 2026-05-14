import {
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  Post,
  Query,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService, ChannelAppAuthBody } from "./auth.service";

interface HttpResponse {
  setHeader(name: string, value: string | string[]): this;
  redirect(url: string): void;
}

@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Get("mezon")
  startMezonLogin(
    @Query("returnTo") returnTo: string | undefined,
    @Res() response: HttpResponse,
  ): void {
    const start = this.authService.createMezonOAuthStart(returnTo);
    response.setHeader("Set-Cookie", start.cookies);
    response.redirect(start.authorizationUrl);
  }

  @Get("mezon/callback")
  async completeMezonLogin(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Headers("cookie") cookieHeader: string | undefined,
    @Res() response: HttpResponse,
  ): Promise<void> {
    try {
      const result = await this.authService.completeMezonOAuth({
        code,
        state,
        cookieHeader,
      });

      response.setHeader("Set-Cookie", [
        ...this.authService.clearMezonOAuthCookies(),
        this.authService.createSessionCookie(result.sessionToken),
      ]);
      response.redirect(result.redirectUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Mezon OAuth callback failed: ${message}`);
      response.setHeader(
        "Set-Cookie",
        this.authService.clearMezonOAuthCookies(),
      );
      response.redirect(this.authService.createLoginErrorUrl("mezon_failed"));
    }
  }

  @Post("mezon/channel-app")
  async loginWithChannelApp(
    @Body() body: ChannelAppAuthBody,
    @Res({ passthrough: true }) response: HttpResponse,
  ): Promise<unknown> {
    const result = await this.authService.authenticateChannelApp(body);
    response.setHeader(
      "Set-Cookie",
      this.authService.createSessionCookie(result.accessToken),
    );
    return result;
  }

  @Get("mezon/me")
  getCurrentUser(@Headers("cookie") cookieHeader: string | undefined) {
    const session = this.authService.readSessionFromCookie(cookieHeader);
    if (!session) {
      throw new UnauthorizedException("Not authenticated");
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

  @Post("logout")
  logout(@Res({ passthrough: true }) response: HttpResponse) {
    response.setHeader("Set-Cookie", this.authService.clearSessionCookie());
    return { success: true };
  }
}
