import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService, SessionPayload } from "./auth.service";

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  session: SessionPayload;
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookieHeader = request.headers["cookie"];
    const cookie = Array.isArray(cookieHeader)
      ? cookieHeader[0]
      : cookieHeader;

    const session = this.authService.readSessionFromCookie(cookie);
    if (!session) {
      throw new UnauthorizedException("Not authenticated");
    }

    request.session = session;
    return true;
  }
}
