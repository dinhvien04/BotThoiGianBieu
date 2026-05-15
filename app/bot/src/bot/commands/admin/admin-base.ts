import { UsersService } from "../../../users/users.service";
import { CommandContext } from "../command.types";

/**
 * Trả về `true` nếu sender là admin (đã có trong DB và `role = 'admin'`,
 * không bị khoá). Nếu không, tự gửi reply phù hợp cho user.
 *
 * Dùng cho mọi lệnh `*admin-*`.
 */
export async function requireAdmin(
  ctx: CommandContext,
  usersService: UsersService,
): Promise<boolean> {
  const user = await usersService.findByUserId(ctx.message.sender_id);
  if (!user) {
    await ctx.reply(
      `❌ Bạn chưa khởi tạo tài khoản. Gõ \`${ctx.prefix}bat-dau\` trước.`,
    );
    return false;
  }
  if (user.is_locked) {
    await ctx.reply("❌ Tài khoản của bạn đang bị khoá.");
    return false;
  }
  if (user.role !== "admin") {
    await ctx.reply("⛔ Lệnh này chỉ dành cho admin.");
    return false;
  }
  return true;
}
