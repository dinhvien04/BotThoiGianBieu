import { Injectable, OnModuleInit } from "@nestjs/common";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import { UsersService } from "../../users/users.service";
import {
  POPULAR_TIMEZONES,
  formatInTimezone,
  formatOffset,
  getTimezoneOffsetMs,
  isValidTimezone,
  resolveTimezoneAlias,
} from "../../shared/utils/timezone";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";

const DEFAULT_TZ = "Asia/Ho_Chi_Minh";

@Injectable()
export class TimezoneCommand implements BotCommand, OnModuleInit {
  readonly name = "timezone";
  readonly aliases = ["mui-gio", "muigio", "tz"];
  readonly description =
    "Xem hoặc đổi múi giờ cá nhân (IANA, vd Asia/Tokyo)";
  readonly category = "⚙️ CÀI ĐẶT";
  readonly syntax = "timezone [<IANA_TZ> | reset | list]";
  readonly example = "timezone Asia/Tokyo";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly formatter: MessageFormatter,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(ctx: CommandContext): Promise<void> {
    const user = await this.usersService.findByUserId(ctx.message.sender_id);
    if (!user) {
      await ctx.reply(this.formatter.formatNotInitialized(ctx.prefix));
      return;
    }

    const currentTz = user.settings?.timezone ?? DEFAULT_TZ;
    const arg = ctx.args[0]?.trim();

    if (!arg) {
      await ctx.reply(this.renderCurrent(currentTz, ctx.prefix));
      return;
    }

    const lower = arg.toLowerCase();
    if (lower === "list" || lower === "ds") {
      await ctx.reply(this.renderList());
      return;
    }
    if (lower === "reset" || lower === "default") {
      await this.usersService.updateSettings(user.user_id, {
        timezone: DEFAULT_TZ,
      });
      await ctx.reply(
        `🕐 Múi giờ đã reset về \`${DEFAULT_TZ}\` (giờ Việt Nam).`,
      );
      return;
    }

    const resolved = resolveTimezoneAlias(arg);
    if (!isValidTimezone(resolved)) {
      await ctx.reply(
        `⚠️ Múi giờ \`${arg}\` không hợp lệ.\n` +
          `💡 Dùng IANA name (vd \`Asia/Tokyo\`, \`Europe/London\`) hoặc gõ \`${ctx.prefix}timezone list\` để xem gợi ý.`,
      );
      return;
    }

    if (resolved === currentTz) {
      await ctx.reply(
        `ℹ️ Múi giờ hiện tại đã là \`${resolved}\` — không có gì để đổi.`,
      );
      return;
    }

    await this.usersService.updateSettings(user.user_id, {
      timezone: resolved,
    });
    const now = new Date();
    const offset = formatOffset(getTimezoneOffsetMs(now, resolved));
    await ctx.reply(
      `🕐 Đã đổi múi giờ sang \`${resolved}\` (${offset}).\n` +
        `Giờ hiện tại theo múi mới: ${formatInTimezone(now, resolved)}.\n` +
        `_Lưu ý: bot vẫn hiển thị giờ Việt Nam ở các view khác cho tới khi đầy đủ tích hợp tz._`,
    );
  }

  private renderCurrent(tz: string, prefix: string): string {
    const now = new Date();
    const offset = formatOffset(getTimezoneOffsetMs(now, tz));
    return [
      `🕐 **Múi giờ hiện tại:** \`${tz}\` (${offset})`,
      `Giờ ngay bây giờ: ${formatInTimezone(now, tz)}`,
      ``,
      `🛠️ Đổi: \`${prefix}timezone <IANA>\` (vd \`${prefix}timezone Asia/Tokyo\`)`,
      `🛠️ Reset: \`${prefix}timezone reset\``,
      `🛠️ Xem gợi ý: \`${prefix}timezone list\``,
    ].join("\n");
  }

  private renderList(): string {
    const now = new Date();
    const lines = POPULAR_TIMEZONES.map((tz) => {
      const offset = formatOffset(getTimezoneOffsetMs(now, tz));
      return `- \`${tz}\` (${offset})`;
    });
    return [
      `🕐 **Múi giờ phổ biến:**`,
      ...lines,
      ``,
      `IANA full list: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones`,
    ].join("\n");
  }
}
