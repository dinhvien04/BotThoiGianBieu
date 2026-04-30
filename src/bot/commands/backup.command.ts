import { Injectable, OnModuleInit } from "@nestjs/common";
import {
  BackupService,
  summarizeBackup,
} from "../../schedules/backup.service";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import { UsersService } from "../../users/users.service";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";

const MAX_INLINE_BYTES = 3500;

@Injectable()
export class BackupCommand implements BotCommand, OnModuleInit {
  readonly name = "backup";
  readonly aliases = ["sao-luu", "saoluu", "export-json", "exportjson"];
  readonly description =
    "Sao lưu toàn bộ data của bạn (lịch + tag + template + cài-đặt) ra JSON";
  readonly category = "📅 XEM LỊCH";
  readonly syntax = "backup";
  readonly example = "backup";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly backupService: BackupService,
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

    const backup = await this.backupService.buildBackup(user.user_id);
    const json = JSON.stringify(backup, null, 2);
    const summary = summarizeBackup(backup);

    if (json.length > MAX_INLINE_BYTES) {
      await ctx.reply(
        `⚠️ Backup quá lớn (${json.length} bytes) để gửi trong 1 message.\n` +
          `📊 ${summary}\n` +
          `💡 Hãy thử dọn lịch cũ trước (vd \`${ctx.prefix}xoa-lich <ID>\`) ` +
          `hoặc liên hệ admin nếu cần backup full.`,
      );
      return;
    }

    const header =
      `💾 **Backup ${user.user_id}** — ${summary}\n` +
      `Copy phần dưới vào file \`backup-${user.user_id}.json\` và lưu trữ.`;
    await ctx.reply(`${header}\n\`\`\`json\n${json}\n\`\`\``);
  }
}
