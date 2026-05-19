import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CsrfGuard } from '../../../app/bot/src/auth/csrf.guard';

function makeContext(
  method: string,
  headers: Record<string, string | string[] | undefined> = {},
  url = '/api/schedules',
) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        url,
        headers,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('CsrfGuard', () => {
  const guard = new CsrfGuard();

  it('allows safe methods without custom header', () => {
    expect(guard.canActivate(makeContext('GET'))).toBe(true);
    expect(guard.canActivate(makeContext('HEAD'))).toBe(true);
    expect(guard.canActivate(makeContext('OPTIONS'))).toBe(true);
  });

  it('allows unsafe methods with X-Requested-With', () => {
    expect(guard.canActivate(makeContext('POST', { 'x-requested-with': 'XMLHttpRequest' }))).toBe(
      true,
    );
  });

  it('rejects unsafe methods without X-Requested-With', () => {
    expect(() => guard.canActivate(makeContext('DELETE'))).toThrow(ForbiddenException);
  });

  it('allows Mezon channel-app HMAC login without CSRF header', () => {
    expect(guard.canActivate(makeContext('POST', {}, '/auth/mezon/channel-app'))).toBe(true);
  });
});
