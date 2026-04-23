import { Injectable } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';
import { UserSettings } from '../../users/entities/user-settings.entity';

export interface HelpRenderEntry {
  syntax: string;
  description: string;
  category: string;
  implemented: boolean;
}

@Injectable()
export class MessageFormatter {
  formatWelcome(user: User, settings: UserSettings, isNew: boolean, prefix: string): string {
    const displayName = user.display_name ?? user.username ?? user.user_id;

    if (!isNew) {
      return (
        `👋 Chào lại ${displayName}!\n` +
        `Bạn đã khởi tạo từ trước rồi.\n\n` +
        `📋 CÀI ĐẶT HIỆN TẠI:\n` +
        `- Múi giờ: \`${settings.timezone}\`\n` +
        `- Nhắc trước mặc định: \`${settings.default_remind_minutes} phút\`\n` +
        `- Channel mặc định: \`${settings.default_channel_id ?? 'chưa đặt'}\`\n` +
        `- Nhận nhắc qua DM: \`${settings.notify_via_dm ? 'có' : 'không'}\`\n\n` +
        `💡 Gõ \`${prefix}help\` để xem danh sách lệnh.`
      );
    }

    return (
      `🎉 Xin chào ${displayName}! Đã khởi tạo tài khoản thành công.\n\n` +
      `📋 CÀI ĐẶT MẶC ĐỊNH:\n` +
      `- Múi giờ: \`${settings.timezone}\`\n` +
      `- Nhắc trước: \`${settings.default_remind_minutes} phút\`\n` +
      `- Channel mặc định: \`${settings.default_channel_id ?? 'chưa đặt'}\`\n\n` +
      `🚀 BẮT ĐẦU NGAY:\n` +
      `- \`${prefix}them-lich\`: thêm lịch mới.\n` +
      `- \`${prefix}lich-hom-nay\`: xem lịch hôm nay.\n` +
      `- \`${prefix}help\`: xem toàn bộ lệnh.`
    );
  }

  formatHelp(entries: HelpRenderEntry[], categoryOrder: string[], prefix: string): string {
    const grouped = new Map<string, HelpRenderEntry[]>();
    for (const entry of entries) {
      const list = grouped.get(entry.category) ?? [];
      list.push(entry);
      grouped.set(entry.category, list);
    }

    const orderedCategories = [
      ...categoryOrder.filter((c) => grouped.has(c)),
      ...[...grouped.keys()].filter((c) => !categoryOrder.includes(c)),
    ];

    let message = `🗓️ BOT THỜI GIAN BIỂU - DANH SÁCH LỆNH 🗓️\n\n`;

    for (const category of orderedCategories) {
      const items = grouped.get(category) ?? [];
      message += `${category}:\n`;
      for (const item of items) {
        const tail = item.implemented ? '' : ' 🚧';
        message += `- \`${prefix}${item.syntax}\`: ${item.description}.${tail}\n`;
      }
      message += `\n`;
    }

    message += `💡 Chú thích: 🚧 = sắp ra mắt.`;
    return message;
  }

  formatNotInitialized(prefix: string): string {
    return (
      `⚠️ Bạn chưa khởi tạo tài khoản.\n` +
      `Vui lòng dùng lệnh \`${prefix}batdau\` để bắt đầu sử dụng bot.`
    );
  }
}
