import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { AdminGuard } from "../../../app/bot/src/admin/admin.guard";

function makeContext(cookie: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: { cookie },
      }),
    }),
  } as unknown as ExecutionContext;
}

describe("AdminGuard", () => {
  let authService: {
    readSessionFromCookie: jest.Mock;
  };
  let usersService: { findByUserId: jest.Mock };
  let guard: AdminGuard;

  beforeEach(() => {
    authService = { readSessionFromCookie: jest.fn() };
    usersService = { findByUserId: jest.fn() };
    guard = new AdminGuard(
      authService as never,
      usersService as never,
    );
  });

  it("throws Unauthorized when session is missing", async () => {
    authService.readSessionFromCookie.mockReturnValue(null);
    await expect(
      guard.canActivate(makeContext("anything")),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("throws Forbidden when user not found in DB", async () => {
    authService.readSessionFromCookie.mockReturnValue({ sub: "u-1" });
    usersService.findByUserId.mockResolvedValue(null);
    await expect(
      guard.canActivate(makeContext("c")),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("throws Forbidden when user is locked", async () => {
    authService.readSessionFromCookie.mockReturnValue({ sub: "u-1" });
    usersService.findByUserId.mockResolvedValue({
      user_id: "u-1",
      role: "admin",
      is_locked: true,
    });
    await expect(
      guard.canActivate(makeContext("c")),
    ).rejects.toThrow("Account locked");
  });

  it("throws Forbidden when user is not admin", async () => {
    authService.readSessionFromCookie.mockReturnValue({ sub: "u-1" });
    usersService.findByUserId.mockResolvedValue({
      user_id: "u-1",
      role: "user",
      is_locked: false,
    });
    await expect(
      guard.canActivate(makeContext("c")),
    ).rejects.toThrow("Admin access required");
  });

  it("allows admin user and stores session on request", async () => {
    const session = { sub: "admin-1", username: "boss" };
    authService.readSessionFromCookie.mockReturnValue(session);
    usersService.findByUserId.mockResolvedValue({
      user_id: "admin-1",
      role: "admin",
      is_locked: false,
    });
    const req: { session?: unknown } = {};
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => Object.assign(req, { headers: { cookie: "c" } }),
      }),
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.session).toBe(session);
  });

  it("handles array cookie header by taking first element", async () => {
    authService.readSessionFromCookie.mockReturnValue({ sub: "u-1" });
    usersService.findByUserId.mockResolvedValue({
      user_id: "u-1",
      role: "admin",
      is_locked: false,
    });
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { cookie: ["first-cookie", "second"] },
        }),
      }),
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(authService.readSessionFromCookie).toHaveBeenCalledWith(
      "first-cookie",
    );
  });
});
