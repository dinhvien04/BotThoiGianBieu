import { Injectable, OnModuleInit } from "@nestjs/common";
import { UsersService } from "../../users/users.service";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";

@Injectable()
export class BatDauCommand implements BotCommand, OnModuleInit {
  readonly name = "bat-dau";
  readonly aliases = ["batdau", "start"];
  readonly description = "Khởi tạo tài khoản và cài đặt mặc định";
  readonly category = "🆕 Khởi tạo";
  readonly syntax = "bat-dau";
  readonly example = "bat-dau";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly formatter: MessageFormatter,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(ctx: CommandContext): Promise<void> {
    const { message } = ctx;

    const result = await this.usersService.registerUser({
      user_id: message.sender_id,
      username: message.username ?? null,
      display_name: message.display_name ?? null,
      default_channel_id: message.channel_id,
    });

    const reply = this.formatter.formatWelcome(
      result.user,
      result.settings,
      result.isNew,
      ctx.prefix,
    );
    await ctx.reply(reply);
  }
}
