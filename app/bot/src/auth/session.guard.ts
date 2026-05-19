import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService, SessionPayload } from './auth.service';
import { UsersService } from '../users/users.service';

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  session: SessionPayload;
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookieHeader = request.headers['cookie'];
    const cookie = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;

    const session = this.authService.readSessionFromCookie(cookie);
    if (!session) {
      throw new UnauthorizedException('Not authenticated');
    }

    const user = await this.usersService.findByUserId(session.sub);
    if (!user) {
      throw new UnauthorizedException('Not authenticated');
    }
    if ((user.token_version ?? 0) !== session.tokenVersion) {
      throw new UnauthorizedException('Session revoked');
    }
    if (user.is_locked) {
      throw new ForbiddenException('Account locked');
    }

    request.session = session;
    return true;
  }
}
