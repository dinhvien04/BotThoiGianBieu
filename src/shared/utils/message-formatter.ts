import { Injectable } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';
import { UserSettings } from '../../users/entities/user-settings.entity';

export interface CommandHelpEntry {
  name: string;
  syntax: string;
  description: string;
  category: string;
  example?: string;
}

@Injectable()
export class MessageFormatter {
  formatWelcome(user: User, settings: UserSettings, isNew: boolean, prefix: string): string {
    const displayName = user.display_name ?? user.username ?? user.user_id;

    if (!isNew) {
      return (
        `👋 Chào lại **${displayName}**!\n` +
        `Bạn đã khởi tạo từ trước rồi.\n\n` +
        `📋 Cài đặt hiện tại:\n` +
        `  • Múi giờ: \`${settings.timezone}\`\n` +
        `  • Nhắc trước mặc định: \`${settings.default_remind_minutes} phút\`\n` +
        `  • Channel mặc định: \`${settings.default_channel_id ?? 'chưa đặt'}\`\n` +
        `  • Nhận nhắc qua DM: \`${settings.notify_via_dm ? 'có' : 'không'}\`\n\n` +
        `Gõ \`${prefix}help\` để xem danh sách lệnh.`
      );
    }

    return (
      `🎉 Xin chào **${displayName}**! Đã khởi tạo tài khoản thành công.\n\n` +
      `📋 Cài đặt mặc định:\n` +
      `  • Múi giờ: \`${settings.timezone}\`\n` +
      `  • Nhắc trước: \`${settings.default_remind_minutes} phút\`\n` +
      `  • Channel mặc định: \`${settings.default_channel_id ?? 'chưa đặt'}\`\n\n` +
      `🚀 Bắt đầu nào! Một vài lệnh hữu ích:\n` +
      `  • \`${prefix}them-lich\` — thêm lịch mới\n` +
      `  • \`${prefix}lich-hom-nay\` — xem lịch hôm nay\n` +
      `  • \`${prefix}help\` — xem toàn bộ lệnh`
    );
  }

  formatHelp(entries: CommandHelpEntry[], prefix: string): string {
    const grouped = new Map<string, CommandHelpEntry[]>();
    for (const entry of entries) {
      const list = grouped.get(entry.category) ?? [];
      list.push(entry);
      grouped.set(entry.category, list);
    }

    let message = `📖 **HƯỚNG DẪN SỬ DỤNG BOT THỜI GIAN BIỂU**\n`;
    message += `_Prefix: \`${prefix}\`_\n\n`;

    for (const [category, items] of grouped) {
      message += `**${category}**\n`;
      for (const item of items) {
        message += `  • \`${prefix}${item.syntax}\` — ${item.description}\n`;
        if (item.example) {
          message += `     _Ví dụ:_ \`${prefix}${item.example}\`\n`;
        }
      }
      message += `\n`;
    }

    message += `💡 _Gặp lỗi hoặc cần hỗ trợ? Liên hệ admin clan._`;
    return message;
  }

  formatNotInitialized(prefix: string): string {
    return (
      `⚠️ Bạn chưa khởi tạo tài khoản.\n` +
      `Vui lòng dùng lệnh \`${prefix}bat-dau\` để bắt đầu sử dụng bot.`
    );
  }
}
