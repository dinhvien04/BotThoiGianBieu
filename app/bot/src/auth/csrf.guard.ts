import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

interface HttpRequestLike {
  method?: string;
  originalUrl?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_COOKIE = 'btgb_csrf';

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<HttpRequestLike>();
    const method = (request.method ?? 'GET').toUpperCase();
    if (SAFE_METHODS.has(method)) {
      return true;
    }
    const path = this.getRequestPath(request);
    if (method === 'POST' && (path === '/auth/mezon/channel-app' || path === '/auth/logout')) {
      return true;
    }

    const requestedWith = this.getHeader(request, 'x-requested-with');
    const csrfHeader = this.getHeader(request, 'x-csrf-token');
    const csrfCookie = this.parseCookies(this.getHeader(request, 'cookie'))[CSRF_COOKIE];

    if (
      requestedWith?.toLowerCase() === 'xmlhttprequest' &&
      csrfHeader &&
      csrfCookie &&
      safeCompare(csrfHeader, csrfCookie)
    ) {
      return true;
    }

    throw new ForbiddenException('Missing or invalid CSRF token');
  }

  private getRequestPath(request: HttpRequestLike): string {
    const url = request.originalUrl ?? request.url ?? '';
    return url.split('?', 1)[0];
  }

  private getHeader(request: HttpRequestLike, name: string): string | undefined {
    const exact = request.headers[name];
    const value =
      exact ??
      Object.entries(request.headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
    return Array.isArray(value) ? value[0] : value;
  }

  private parseCookies(cookieHeader?: string): Record<string, string> {
    if (!cookieHeader) return {};
    return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
      const trimmed = part.trim();
      const separator = trimmed.indexOf('=');
      if (separator <= 0) return acc;
      const name = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      if (!name) return acc;
      try {
        acc[name] = decodeURIComponent(value);
      } catch {
        acc[name] = value;
      }
      return acc;
    }, {});
  }
}
