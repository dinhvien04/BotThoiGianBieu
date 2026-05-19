import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

interface HttpRequestLike {
  method?: string;
  originalUrl?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<HttpRequestLike>();
    const method = (request.method ?? 'GET').toUpperCase();
    if (SAFE_METHODS.has(method)) {
      return true;
    }
    if (method === 'POST' && this.getRequestPath(request) === '/auth/mezon/channel-app') {
      return true;
    }

    const header = request.headers['x-requested-with'];
    const value = Array.isArray(header) ? header[0] : header;
    if (typeof value === 'string' && value.toLowerCase() === 'xmlhttprequest') {
      return true;
    }

    throw new ForbiddenException('Missing CSRF protection header');
  }

  private getRequestPath(request: HttpRequestLike): string {
    const url = request.originalUrl ?? request.url ?? '';
    return url.split('?', 1)[0];
  }
}
