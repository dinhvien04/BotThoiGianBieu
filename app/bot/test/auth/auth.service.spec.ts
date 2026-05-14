import { ConfigService } from "@nestjs/config";
import { createHash, createHmac } from "node:crypto";
import { AuthService } from "../../src/auth/auth.service";
import { UsersService } from "../../src/users/users.service";

describe("AuthService", () => {
  const appSecret = "test-app-secret-123456";
  const sessionSecret = "test-session-secret-123456";
  const now = 1_800_000_000;
  let service: AuthService;
  let usersService: jest.Mocked<Pick<UsersService, "registerUser">>;

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(now * 1000);
    usersService = {
      registerUser: jest.fn().mockResolvedValue({
        user: {},
        settings: {},
        isNew: false,
      }),
    };

    const config = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          MEZON_APP_SECRET: appSecret,
          AUTH_TOKEN_SECRET: sessionSecret,
          MEZON_CHANNEL_AUTH_MAX_AGE_SECONDS: "86400",
        };
        return values[key];
      }),
    } as unknown as ConfigService;

    service = new AuthService(config, usersService as unknown as UsersService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("authenticates valid Mezon channel hash data", async () => {
    const rawHashData = createChannelHashData(appSecret, now);

    const result = await service.authenticateChannelApp({ rawHashData });

    expect(result.success).toBe(true);
    expect(result.user).toEqual({
      user_id: "123456789",
      username: "mezon_dev",
      display_name: "Mezon Dev",
    });
    expect(result.accessToken).toEqual(expect.any(String));
    expect(usersService.registerUser).toHaveBeenCalledWith({
      user_id: "123456789",
      username: "mezon_dev",
      display_name: "Mezon Dev",
    });
  });

  it("accepts base64 encoded Mezon channel hash data", async () => {
    const rawHashData = createChannelHashData(appSecret, now);
    const hashData = Buffer.from(rawHashData, "utf8").toString("base64");

    const result = await service.authenticateChannelApp({ hashData });

    expect(result.success).toBe(true);
    expect(result.user.user_id).toBe("123456789");
  });

  it("rejects invalid Mezon channel hash signatures", async () => {
    const rawHashData = createChannelHashData(appSecret, now).replace(
      "mezon_dev",
      "attacker",
    );

    await expect(
      service.authenticateChannelApp({ rawHashData }),
    ).rejects.toThrow("Invalid Mezon hash signature");
    expect(usersService.registerUser).not.toHaveBeenCalled();
  });

  it("reads a signed session from cookie", async () => {
    const rawHashData = createChannelHashData(appSecret, now);
    const result = await service.authenticateChannelApp({ rawHashData });

    const session = service.readSessionFromCookie(
      `btgb_auth=${encodeURIComponent(result.accessToken)}`,
    );

    expect(session).toMatchObject({
      sub: "123456789",
      username: "mezon_dev",
      displayName: "Mezon Dev",
      provider: "mezon",
    });
  });
});

function createChannelHashData(secret: string, authDate: number): string {
  const user = encodeURIComponent(
    JSON.stringify({
      id: 123456789,
      username: "mezon_dev",
      display_name: "Mezon Dev",
      mezon_id: "mezon.dev@ncc.asia",
    }),
  );
  const queryData = [
    "query_id=test-query",
    `user=${user}`,
    `auth_date=${authDate}`,
    "signature=test-signature",
  ].join("&");
  const hashedSecret = createHash("md5").update(secret).digest("hex");
  const secretKey = createHmac("sha256", hashedSecret)
    .update("WebAppData")
    .digest();
  const hash = createHmac("sha256", secretKey)
    .update(queryData)
    .digest("hex");

  return `${queryData}&hash=${hash}`;
}
