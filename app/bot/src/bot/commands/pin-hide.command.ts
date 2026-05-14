import { Injectable, OnModuleInit } from "@nestjs/common";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import { SchedulesService } from "../../schedules/schedules.service";
import { UsersService } from "../../users/users.service";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";

function parseId(input: string | undefined): number | null {
  if (!input || !/^\d+$/.test(input)) return null;
  const v = Number(input);
  return v > 0 ? v : null;
}

@Injectable()
export class GhimCommand implements BotCommand, OnModuleInit {
  readonly name = "ghim";
  readonly aliases = ["pin"];
  readonly description = "Ghim lịch lên đầu các digest commands";
  readonly category = "✏️ QUẢN LÝ LỊCH";
  readonly syntax = "ghim <ID>";
  readonly example = "ghim 5";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly schedulesService: SchedulesService,
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
    const id = parseId(ctx.args[0]);
    if (!id) {
      await ctx.reply(`⚠️ Cú pháp: \`${ctx.prefix}${this.syntax}\``);
      return;
    }
    const schedule = await this.schedulesService.setPinned(
      user.user_id,
      id,
      true,
    );
    if (!schedule) {
      await ctx.reply(`⚠️ Không tìm thấy lịch #${id} của bạn.`);
      return;
    }
    await ctx.reply(`📌 Đã ghim lịch #${id} — ${schedule.title}`);
  }
}

@Injectable()
export class BoGhimCommand implements BotCommand, OnModuleInit {
  readonly name = "bo-ghim";
  readonly aliases = ["unpin", "boghim"];
  readonly description = "Bỏ ghim lịch";
  readonly category = "✏️ QUẢN LÝ LỊCH";
  readonly syntax = "bo-ghim <ID>";
  readonly example = "bo-ghim 5";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly schedulesService: SchedulesService,
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
    const id = parseId(ctx.args[0]);
    if (!id) {
      await ctx.reply(`⚠️ Cú pháp: \`${ctx.prefix}${this.syntax}\``);
      return;
    }
    const schedule = await this.schedulesService.setPinned(
      user.user_id,
      id,
      false,
    );
    if (!schedule) {
      await ctx.reply(`⚠️ Không tìm thấy lịch #${id} của bạn.`);
      return;
    }
    await ctx.reply(`📌 Đã bỏ ghim lịch #${id} — ${schedule.title}`);
  }
}

@Injectable()
export class LichAnCommand implements BotCommand, OnModuleInit {
  readonly name = "lich-an";
  readonly aliases = ["an", "hide"];
  readonly description =
    "Ẩn lịch khỏi digest commands (vẫn xem được qua *chi-tiet)";
  readonly category = "✏️ QUẢN LÝ LỊCH";
  readonly syntax = "lich-an <ID>";
  readonly example = "lich-an 5";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly schedulesService: SchedulesService,
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
    const id = parseId(ctx.args[0]);
    if (!id) {
      await ctx.reply(`⚠️ Cú pháp: \`${ctx.prefix}${this.syntax}\``);
      return;
    }
    const schedule = await this.schedulesService.setHidden(
      user.user_id,
      id,
      true,
    );
    if (!schedule) {
      await ctx.reply(`⚠️ Không tìm thấy lịch #${id} của bạn.`);
      return;
    }
    await ctx.reply(
      `🙈 Đã ẩn lịch #${id} — ${schedule.title}. ` +
        `Hiện lại bằng \`${ctx.prefix}hien ${id}\`.`,
    );
  }
}

@Injectable()
export class HienCommand implements BotCommand, OnModuleInit {
  readonly name = "hien";
  readonly aliases = ["show", "unhide"];
  readonly description = "Hiện lại lịch đã ẩn";
  readonly category = "✏️ QUẢN LÝ LỊCH";
  readonly syntax = "hien <ID>";
  readonly example = "hien 5";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly schedulesService: SchedulesService,
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
    const id = parseId(ctx.args[0]);
    if (!id) {
      await ctx.reply(`⚠️ Cú pháp: \`${ctx.prefix}${this.syntax}\``);
      return;
    }
    const schedule = await this.schedulesService.setHidden(
      user.user_id,
      id,
      false,
    );
    if (!schedule) {
      await ctx.reply(`⚠️ Không tìm thấy lịch #${id} của bạn.`);
      return;
    }
    await ctx.reply(`👁 Đã hiện lại lịch #${id} — ${schedule.title}`);
  }
}
