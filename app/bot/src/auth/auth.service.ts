import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { UsersService } from "../users/users.service";

const AUTHORIZATION_URL = "https://oauth2.mezon.ai/oauth2/auth";
const TOKEN_URL = "https://oauth2.mezon.ai/oauth2/token";
const USERINFO_URL = "https://oauth2.mezon.ai/userinfo";

const SESSION_COOKIE = "btgb_auth";
const OAUTH_STATE_COOKIE = "btgb_mezon_state";
const OAUTH_RETURN_TO_COOKIE = "btgb_mezon_return_to";
const DEFAULT_WEB_URL = "http://localhost:3000";
const DEFAULT_API_URL = "http://localhost:3001";
const DEFAULT_RETURN_TO = "/dashboard";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const CHANNEL_AUTH_MAX_AGE_SECONDS = 60 * 60 * 24;

export interface ChannelAppAuthBody {
  hashData?: string;
  rawHashData?: string;
  data?: string;
}

export interface SessionPayload {
  sub: string;
  username: string | null;
  displayName: string | null;
  provider: "mezon";
  iat: number;
  exp: number;
}

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
}

interface OAuthTokenResponse {
  access_token?: unknown;
  token_type?: unknown;
  expires_in?: unknown;
  scope?: unknown;
  error?: unknown;
  error_description?: unknown;
}

interface OAuthStartResult {
  authorizationUrl: string;
  cookies: string[];
}

interface OAuthCompleteInput {
  code?: string;
  state?: string;
  cookieHeader?: string;
}

interface OAuthCompleteResult {
  sessionToken: string;
  redirectUrl: string;
}

interface NormalizedMezonUser {
  user_id: string;
  username: string | null;
  display_name: string | null;
}

interface ParsedChannelAuth {
  query_id: string | null;
  auth_date: number;
  signature: string | null;
  user: Record<string, unknown>;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  createMezonOAuthStart(returnTo?: string): OAuthStartResult {
    const oauth = this.getOAuthConfig();
    const state = this.createOAuthState();
    const safeReturnTo = this.normalizeReturnTo(returnTo);
    const url = new URL(AUTHORIZATION_URL);

    url.searchParams.set("client_id", oauth.clientId);
    url.searchParams.set("redirect_uri", oauth.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", oauth.scope);
    url.searchParams.set("state", state);

    return {
      authorizationUrl: url.toString(),
      cookies: [
        this.buildCookie(OAUTH_STATE_COOKIE, state, {
          maxAgeSeconds: 600,
          path: "/auth/mezon",
        }),
        this.buildCookie(OAUTH_RETURN_TO_COOKIE, safeReturnTo, {
          maxAgeSeconds: 600,
          path: "/auth/mezon",
        }),
      ],
    };
  }

  async completeMezonOAuth(
    input: OAuthCompleteInput,
  ): Promise<OAuthCompleteResult> {
    if (!input.code || !input.state) {
      throw new BadRequestException("Missing Mezon OAuth callback parameters");
    }

    const cookies = this.parseCookies(input.cookieHeader);
    if (cookies[OAUTH_STATE_COOKIE] !== input.state) {
      throw new UnauthorizedException("Invalid Mezon OAuth state");
    }

    const oauth = this.getOAuthConfig();
    const token = await this.exchangeCodeForToken(oauth, input.code, input.state);
    const mezonUser = await this.fetchMezonUser(token);
    const user = this.normalizeOAuthUser(mezonUser);

    await this.usersService.registerUser(user);

    const sessionToken = this.signSession({
      sub: user.user_id,
      username: user.username,
      displayName: user.display_name,
      provider: "mezon",
      iat: this.nowSeconds(),
      exp: this.nowSeconds() + SESSION_TTL_SECONDS,
    });

    return {
      sessionToken,
      redirectUrl: this.createWebUrl(
        cookies[OAUTH_RETURN_TO_COOKIE] ?? DEFAULT_RETURN_TO,
      ),
    };
  }

  async authenticateChannelApp(body: ChannelAppAuthBody) {
    const rawHashData = this.decodeChannelHashData(body);
    const appSecret = this.getMezonAppSecret();

    if (!this.validateMezonHash(appSecret, rawHashData)) {
      throw new UnauthorizedException("Invalid Mezon hash signature");
    }

    const parsed = this.parseChannelAuthData(rawHashData);
    this.assertFreshChannelAuth(parsed.auth_date);

    const user = this.normalizeChannelUser(parsed.user);
    await this.usersService.registerUser(user);

    const accessToken = this.signSession({
      sub: user.user_id,
      username: user.username,
      displayName: user.display_name,
      provider: "mezon",
      iat: this.nowSeconds(),
      exp: this.nowSeconds() + SESSION_TTL_SECONDS,
    });

    return {
      success: true,
      accessToken,
      user,
      query_id: parsed.query_id,
      signature: parsed.signature,
    };
  }

  readSessionFromCookie(cookieHeader?: string): SessionPayload | null {
    const cookies = this.parseCookies(cookieHeader);
    const token = cookies[SESSION_COOKIE];
    return token ? this.verifySession(token) : null;
  }

  createSessionCookie(sessionToken: string): string {
    return this.buildCookie(SESSION_COOKIE, sessionToken, {
      maxAgeSeconds: SESSION_TTL_SECONDS,
      path: "/",
    });
  }

  clearSessionCookie(): string {
    return this.clearCookie(SESSION_COOKIE, "/");
  }

  clearMezonOAuthCookies(): string[] {
    return [
      this.clearCookie(OAUTH_STATE_COOKIE, "/auth/mezon"),
      this.clearCookie(OAUTH_RETURN_TO_COOKIE, "/auth/mezon"),
    ];
  }

  createLoginErrorUrl(error: string): string {
    const url = new URL("/dang-nhap", this.getWebUrl());
    url.searchParams.set("error", error);
    return url.toString();
  }

  private async exchangeCodeForToken(
    oauth: OAuthConfig,
    code: string,
    state: string,
  ): Promise<string> {
    const form = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      state,
      client_id: oauth.clientId,
      client_secret: oauth.clientSecret,
      redirect_uri: oauth.redirectUri,
    });

    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const data = (await response.json()) as OAuthTokenResponse;

    if (!response.ok || typeof data.access_token !== "string") {
      this.logger.error(
        `Mezon token exchange failed (${response.status}): ${JSON.stringify(data)}`,
      );
      throw new UnauthorizedException("Mezon token exchange failed");
    }

    return data.access_token;
  }

  private async fetchMezonUser(accessToken: string): Promise<Record<string, unknown>> {
    const response = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await response.json()) as unknown;

    if (!response.ok || !this.isRecord(data)) {
      this.logger.error(
        `Mezon userinfo failed (${response.status}): ${JSON.stringify(data)}`,
      );
      throw new UnauthorizedException("Cannot fetch Mezon user info");
    }

    return data;
  }

  private normalizeOAuthUser(data: Record<string, unknown>): NormalizedMezonUser {
    const nestedUser = this.isRecord(data.user) ? data.user : undefined;
    const source = nestedUser ?? data;
    const id =
      this.readString(source, ["id", "user_id", "sub"]) ??
      this.readString(data, ["sub", "id", "user_id"]);

    if (!id) {
      throw new UnauthorizedException("Mezon user info is missing user id");
    }

    return {
      user_id: id,
      username: this.readString(source, [
        "username",
        "preferred_username",
        "mezon_id",
      ]),
      display_name: this.readString(source, [
        "display_name",
        "name",
        "full_name",
        "username",
      ]),
    };
  }

  private normalizeChannelUser(
    data: Record<string, unknown>,
  ): NormalizedMezonUser {
    const id = this.readString(data, ["id", "user_id", "mezon_id"]);
    if (!id) {
      throw new BadRequestException("Mezon channel auth is missing user id");
    }

    return {
      user_id: id,
      username: this.readString(data, ["username", "mezon_id"]),
      display_name: this.readString(data, [
        "display_name",
        "name",
        "username",
      ]),
    };
  }

  private validateMezonHash(appSecret: string, rawHashData: string): boolean {
    const delimiter = "&hash=";
    const index = rawHashData.indexOf(delimiter);
    if (index < 0) {
      return false;
    }

    const queryData = rawHashData.slice(0, index);
    const receivedHash = rawHashData.slice(index + delimiter.length);
    if (!/^[a-f0-9]{64}$/i.test(receivedHash)) {
      return false;
    }

    const hashedSecret = createHash("md5").update(appSecret).digest("hex");
    const secretKey = createHmac("sha256", hashedSecret)
      .update("WebAppData")
      .digest();
    const computedHash = createHmac("sha256", secretKey)
      .update(queryData)
      .digest("hex");

    const computed = Buffer.from(computedHash, "hex");
    const received = Buffer.from(receivedHash, "hex");
    return (
      computed.length === received.length && timingSafeEqual(computed, received)
    );
  }

  private parseChannelAuthData(rawHashData: string): ParsedChannelAuth {
    const delimiter = "&hash=";
    const index = rawHashData.indexOf(delimiter);
    if (index < 0) {
      throw new BadRequestException("Invalid Mezon hash data");
    }

    const queryData = rawHashData.slice(0, index);
    const params = new URLSearchParams(queryData);
    const userRaw = params.get("user");
    const authDateRaw = params.get("auth_date");

    if (!userRaw || !authDateRaw) {
      throw new BadRequestException("Mezon hash data is missing fields");
    }

    const user = JSON.parse(userRaw) as unknown;
    const authDate = Number(authDateRaw);
    if (!this.isRecord(user) || !Number.isFinite(authDate)) {
      throw new BadRequestException("Invalid Mezon channel auth payload");
    }

    return {
      query_id: params.get("query_id"),
      auth_date: authDate,
      signature: params.get("signature"),
      user,
    };
  }

  private assertFreshChannelAuth(authDate: number): void {
    const maxAge = Number(
      this.readConfig(
        ["MEZON_CHANNEL_AUTH_MAX_AGE_SECONDS"],
        String(CHANNEL_AUTH_MAX_AGE_SECONDS),
      ),
    );
    const age = Math.abs(this.nowSeconds() - authDate);
    if (Number.isFinite(maxAge) && maxAge > 0 && age > maxAge) {
      throw new UnauthorizedException("Mezon channel auth has expired");
    }
  }

  private decodeChannelHashData(body: ChannelAppAuthBody): string {
    const value = body.hashData ?? body.rawHashData ?? body.data;
    if (!value || typeof value !== "string") {
      throw new BadRequestException("Missing Mezon hash data");
    }

    const trimmed = value.trim();
    if (trimmed.includes("&hash=")) {
      return trimmed;
    }

    let decodedUrl = trimmed;
    try {
      decodedUrl = decodeURIComponent(trimmed);
    } catch {
      decodedUrl = trimmed;
    }
    if (decodedUrl.includes("&hash=")) {
      return decodedUrl;
    }

    const decodedBase64 = Buffer.from(trimmed, "base64").toString("utf8");
    if (decodedBase64.includes("&hash=")) {
      return decodedBase64;
    }

    throw new BadRequestException("Invalid Mezon hash data encoding");
  }

  private signSession(payload: SessionPayload): string {
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const signature = this.hmacSession(encodedPayload);
    return `${encodedPayload}.${signature}`;
  }

  private verifySession(token: string): SessionPayload | null {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) {
      return null;
    }

    const expectedSignature = this.hmacSession(encodedPayload);
    if (!this.safeEqual(signature, expectedSignature)) {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(
        Buffer.from(encodedPayload, "base64url").toString("utf8"),
      );
    } catch {
      return null;
    }

    if (!this.isSessionPayload(parsed) || parsed.exp <= this.nowSeconds()) {
      return null;
    }

    return parsed;
  }

  private hmacSession(encodedPayload: string): string {
    return createHmac("sha256", this.getSessionSecret())
      .update(encodedPayload)
      .digest("base64url");
  }

  private safeEqual(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
  }

  private getOAuthConfig(): OAuthConfig {
    const clientId = this.readConfig(["MEZON_CLIENT_ID", "APPLICATION_ID"]);
    const clientSecret = this.readConfig([
      "MEZON_CLIENT_SECRET",
      "APPLICATION_TOKEN",
    ]);
    const redirectUri = this.readConfig(
      ["MEZON_REDIRECT_URI"],
      `${this.getApiUrl()}/auth/mezon/callback`,
    );

    if (!clientId || !clientSecret) {
      throw new Error(
        "Missing MEZON_CLIENT_ID/MEZON_CLIENT_SECRET or APPLICATION_ID/APPLICATION_TOKEN",
      );
    }

    return {
      clientId,
      clientSecret,
      redirectUri,
      scope: this.readConfig(["MEZON_OAUTH_SCOPE"], "openid offline"),
    };
  }

  private getMezonAppSecret(): string {
    const secret = this.readConfig([
      "MEZON_APP_SECRET",
      "MEZON_CLIENT_SECRET",
      "APPLICATION_TOKEN",
    ]);
    if (!secret) {
      throw new Error("Missing MEZON_APP_SECRET or APPLICATION_TOKEN");
    }
    return secret;
  }

  private getSessionSecret(): string {
    const secret =
      this.readConfig(["AUTH_TOKEN_SECRET"]) ?? this.getMezonAppSecret();
    if (secret.length < 16) {
      throw new Error("AUTH_TOKEN_SECRET must be at least 16 characters");
    }
    return secret;
  }

  private getApiUrl(): string {
    return this.trimTrailingSlash(
      this.readConfig(
        ["BACKEND_PUBLIC_URL", "API_PUBLIC_URL"],
        DEFAULT_API_URL,
      ),
    );
  }

  private getWebUrl(): string {
    return this.trimTrailingSlash(
      this.readConfig(["WEB_APP_URL", "FRONTEND_URL"], DEFAULT_WEB_URL),
    );
  }

  private createWebUrl(pathOrUrl: string): string {
    const returnTo = this.normalizeReturnTo(pathOrUrl);
    return new URL(returnTo, this.getWebUrl()).toString();
  }

  private normalizeReturnTo(returnTo?: string): string {
    if (!returnTo) {
      return DEFAULT_RETURN_TO;
    }

    if (returnTo.startsWith("/") && !returnTo.startsWith("//")) {
      return returnTo;
    }

    try {
      const url = new URL(returnTo);
      if (url.origin === new URL(this.getWebUrl()).origin) {
        return `${url.pathname}${url.search}${url.hash}`;
      }
    } catch {
      return DEFAULT_RETURN_TO;
    }

    return DEFAULT_RETURN_TO;
  }

  private createOAuthState(): string {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const bytes = randomBytes(11);
    return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
  }

  private buildCookie(
    name: string,
    value: string,
    options: { maxAgeSeconds: number; path: string },
  ): string {
    const parts = [
      `${name}=${encodeURIComponent(value)}`,
      `Max-Age=${options.maxAgeSeconds}`,
      `Path=${options.path}`,
      "HttpOnly",
      "SameSite=Lax",
    ];

    const domain = this.config.get<string>("AUTH_COOKIE_DOMAIN");
    if (domain) {
      parts.push(`Domain=${domain}`);
    }
    if (this.config.get<string>("NODE_ENV") === "production") {
      parts.push("Secure");
    }

    return parts.join("; ");
  }

  private clearCookie(name: string, path: string): string {
    const parts = [
      `${name}=`,
      "Max-Age=0",
      `Path=${path}`,
      "HttpOnly",
      "SameSite=Lax",
    ];

    const domain = this.config.get<string>("AUTH_COOKIE_DOMAIN");
    if (domain) {
      parts.push(`Domain=${domain}`);
    }
    if (this.config.get<string>("NODE_ENV") === "production") {
      parts.push("Secure");
    }

    return parts.join("; ");
  }

  private parseCookies(cookieHeader?: string): Record<string, string> {
    if (!cookieHeader) {
      return {};
    }

    return cookieHeader.split(";").reduce<Record<string, string>>(
      (acc, part) => {
        const [rawName, ...rawValue] = part.trim().split("=");
        if (!rawName) {
          return acc;
        }
        acc[rawName] = decodeURIComponent(rawValue.join("="));
        return acc;
      },
      {},
    );
  }

  private readString(
    source: Record<string, unknown>,
    keys: string[],
  ): string | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
      if (typeof value === "number" || typeof value === "bigint") {
        return String(value);
      }
    }
    return null;
  }

  private readConfig(keys: string[]): string | undefined;
  private readConfig(keys: string[], fallback: string): string;
  private readConfig(keys: string[], fallback?: string): string | undefined {
    for (const key of keys) {
      const value = this.config.get<string>(key);
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return fallback;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private isSessionPayload(value: unknown): value is SessionPayload {
    return (
      this.isRecord(value) &&
      typeof value.sub === "string" &&
      (typeof value.username === "string" || value.username === null) &&
      (typeof value.displayName === "string" || value.displayName === null) &&
      value.provider === "mezon" &&
      typeof value.iat === "number" &&
      typeof value.exp === "number"
    );
  }

  private base64UrlEncode(value: string): string {
    return Buffer.from(value, "utf8").toString("base64url");
  }

  private trimTrailingSlash(value: string): string {
    return value.replace(/\/+$/, "");
  }

  private nowSeconds(): number {
    return Math.floor(Date.now() / 1000);
  }
}
