import { Injectable, OnModuleInit } from "@nestjs/common";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";
import { UsersService } from "../../users/users.service";
import { SchedulesService } from "../../schedules/schedules.service";
import {
  CompleteUndoEntry,
  DeleteUndoEntry,
  UndoService,
} from "../../schedules/undo.service";
import { MessageFormatter } from "../../shared/utils/message-formatter";

@Injectable()
export class HoanTacCommand implements BotCommand, OnModuleInit {
  readonly name = "hoan-tac";
  readonly aliases = ["hoantac", "undo"];
  readonly description = "Hoàn tác thao tác xoá / hoàn-thành gần nhất";
  readonly category = "✏️ QUẢN LÝ LỊCH";
  readonly syntax = "hoan-tac";
  readonly example = "hoan-tac";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly schedulesService: SchedulesService,
    private readonly undoService: UndoService,
    private readonly formatter: MessageFormatter,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(ctx: CommandContext): Promise<void> {
    if (ctx.rawArgs) {
      await ctx.reply(
        `⚠️ Lệnh này không nhận tham số. Dùng: \`${ctx.prefix}${this.name}\`.`,
      );
      return;
    }

    const user = await this.usersService.findByUserId(ctx.message.sender_id);
    if (!user) {
      await ctx.reply(this.formatter.formatNotInitialized(ctx.prefix));
      return;
    }

    const entry = this.undoService.pop(user.user_id);
    if (!entry) {
      await ctx.reply(
        `ℹ️ Không có thao tác nào để hoàn tác.\n` +
          `Bot chỉ giữ lại thao tác gần nhất trong vòng 10 phút.`,
      );
      return;
    }

    if (entry.kind === "delete") {
      await this.handleUndoDelete(ctx, entry);
      return;
    }
    await this.handleUndoComplete(ctx, entry);
  }

  private async handleUndoDelete(
    ctx: CommandContext,
    entry: DeleteUndoEntry,
  ): Promise<void> {
    const existing = await this.schedulesService.findById(entry.schedule.id);
    if (existing) {
      await ctx.reply(
        `⚠️ Lịch \`#${entry.schedule.id}\` đã được tạo lại — không cần hoàn tác.`,
      );
      return;
    }

    try {
      await this.schedulesService.restoreFromSnapshot(entry.schedule);
    } catch {
      await ctx.reply(
        `❌ Không thể khôi phục lịch \`#${entry.schedule.id}\`. ` +
          `Có thể đã có xung đột dữ liệu.`,
      );
      return;
    }

    await ctx.reply(
      `↩️ Đã khôi phục lịch \`#${entry.schedule.id}\` — **${entry.schedule.title}**.`,
    );
  }

  private async handleUndoComplete(
    ctx: CommandContext,
    entry: CompleteUndoEntry,
  ): Promise<void> {
    const schedule = await this.schedulesService.findById(
      entry.scheduleId,
      ctx.message.sender_id,
    );
    if (!schedule) {
      await ctx.reply(
        `⚠️ Không tìm thấy lịch \`#${entry.scheduleId}\` — có thể đã bị xoá sau đó.`,
      );
      return;
    }

    await this.schedulesService.update(entry.scheduleId, {
      status: entry.prevStatus,
      remind_at: entry.prevRemindAt,
      acknowledged_at: entry.prevAcknowledgedAt,
      end_notified_at: entry.prevEndNotifiedAt,
    });

    let spawnedNote = "";
    if (entry.spawnedNextId) {
      const spawned = await this.schedulesService.findById(entry.spawnedNextId);
      if (spawned) {
        await this.schedulesService.delete(entry.spawnedNextId);
        spawnedNote = `\n🔁 Đã xoá lịch lặp kế tiếp \`#${entry.spawnedNextId}\` (đã sinh tự động).`;
      }
    }

    await ctx.reply(
      `↩️ Đã hoàn tác — lịch \`#${entry.scheduleId}\` (**${entry.scheduleTitle}**) trở lại trạng thái trước đó.` +
        spawnedNote,
    );
  }
}
