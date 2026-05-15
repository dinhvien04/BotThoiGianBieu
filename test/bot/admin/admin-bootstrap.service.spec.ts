import { ConfigService } from "@nestjs/config";
import { AdminBootstrapService } from "../../../app/bot/src/admin/admin-bootstrap.service";
import { User } from "../../../app/bot/src/users/entities/user.entity";

describe("AdminBootstrapService", () => {
  let userRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };

  function build(envValue: string | undefined): AdminBootstrapService {
    const config = {
      get: jest.fn().mockReturnValue(envValue),
    } as unknown as ConfigService;
    userRepo = {
      findOne: jest.fn(),
      save: jest.fn(async (u) => u),
      create: jest.fn((u) => u),
    };
    return new AdminBootstrapService(config, userRepo as never);
  }

  it("is a no-op when ADMIN_USER_IDS is empty or missing", async () => {
    const svc = build(undefined);
    await svc.onApplicationBootstrap();
    expect(userRepo.findOne).not.toHaveBeenCalled();
    const svc2 = build("   ");
    await svc2.onApplicationBootstrap();
    expect(userRepo.findOne).not.toHaveBeenCalled();
  });

  it("creates new admin row when user_id missing", async () => {
    const svc = build("new-1");
    userRepo.findOne.mockResolvedValue(null);
    await svc.onApplicationBootstrap();
    expect(userRepo.create).toHaveBeenCalledWith({
      user_id: "new-1",
      username: null,
      display_name: null,
      role: "admin",
      is_locked: false,
    });
    expect(userRepo.save).toHaveBeenCalled();
  });

  it("promotes existing user when role differs", async () => {
    const existing = {
      user_id: "u-1",
      role: "user",
      is_locked: false,
    } as User;
    const svc = build("u-1");
    userRepo.findOne.mockResolvedValue(existing);
    await svc.onApplicationBootstrap();
    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u-1", role: "admin" }),
    );
  });

  it("unlocks existing admin when locked", async () => {
    const existing = {
      user_id: "u-1",
      role: "admin",
      is_locked: true,
    } as User;
    const svc = build("u-1");
    userRepo.findOne.mockResolvedValue(existing);
    await svc.onApplicationBootstrap();
    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ is_locked: false }),
    );
  });

  it("skips save when admin already in correct state", async () => {
    const existing = {
      user_id: "u-1",
      role: "admin",
      is_locked: false,
    } as User;
    const svc = build("u-1");
    userRepo.findOne.mockResolvedValue(existing);
    await svc.onApplicationBootstrap();
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it("handles comma + whitespace separated list", async () => {
    const svc = build(" a , ,b,c ");
    userRepo.findOne.mockResolvedValue(null);
    await svc.onApplicationBootstrap();
    expect(userRepo.findOne).toHaveBeenCalledTimes(3);
    expect(userRepo.create).toHaveBeenCalledTimes(3);
  });
});
