import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import type { AuthenticatedRequest } from "../auth/session.guard";
import { UsersService } from "../users/users.service";

/**
 * Guard cho mọi route `/api/admin/*`. Yêu cầu:
 *   1. Có session cookie hợp lệ.
 *   2. User trong DB có `role = 'admin'` và `is_locked = false`.
 *
 * Nếu thiếu (1) → 401. Nếu có session nhưng không phải admin (hoặc bị khoá)
 * → 403 để phân biệt rõ với chưa đăng nhập.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookieHeader = request.headers["cookie"];
    const cookie = Array.isArray(cookieHeader)
      ? cookieHeader[0]
      : cookieHeader;

    const session = this.authService.readSessionFromCookie(cookie);
    if (!session) {
      throw new UnauthorizedException("Not authenticated");
    }

    const user = await this.usersService.findByUserId(session.sub);
    if (!user) {
      throw new ForbiddenException("User not found");
    }
    if (user.is_locked) {
      throw new ForbiddenException("Account locked");
    }
    if (user.role !== "admin") {
      throw new ForbiddenException("Admin access required");
    }

    request.session = session;
    return true;
  }
}
