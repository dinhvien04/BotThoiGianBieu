import { Injectable } from "@nestjs/common";
import {
  Schedule,
  ScheduleStatus,
} from "../../schedules/entities/schedule.entity";
import { User } from "../../users/entities/user.entity";
import { UserSettings } from "../../users/entities/user-settings.entity";
import { formatDateNoYear, formatDateShort, formatTime } from "./date-utils";

export interface HelpRenderEntry {
  syntax: string;
  description: string;
  category: string;
  implemented: boolean;
}

@Injectable()
export class MessageFormatter {
  formatWelcome(
    user: User,
    settings: UserSettings,
    isNew: boolean,
    prefix: string,
  ): string {
    const displayName = user.display_name ?? user.username ?? user.user_id;

    if (!isNew) {
      return (
        `👋 Chào lại ${displayName}!\n` +
        `Bạn đã khởi tạo từ trước rồi.\n\n` +
        `📋 CÀI ĐẶT HIỆN TẠI:\n` +
        `- Múi giờ: \`${settings.timezone}\`\n` +
        `- Nhắc trước mặc định: \`${settings.default_remind_minutes} phút\`\n` +
        `- Channel mặc định: \`${settings.default_channel_id ?? "chưa đặt"}\`\n` +
        `- Nhận nhắc qua DM: \`${settings.notify_via_dm ? "có" : "không"}\`\n\n` +
        `💡 Gõ \`${prefix}help\` để xem danh sách lệnh.`
      );
    }

    return (
      `🎉 Xin chào ${displayName}! Đã khởi tạo tài khoản thành công.\n\n` +
      `📋 CÀI ĐẶT MẶC ĐỊNH:\n` +
      `- Múi giờ: \`${settings.timezone}\`\n` +
      `- Nhắc trước: \`${settings.default_remind_minutes} phút\`\n` +
      `- Channel mặc định: \`${settings.default_channel_id ?? "chưa đặt"}\`\n\n` +
      `🚀 BẮT ĐẦU NGAY:\n` +
      `- \`${prefix}them-lich\`: thêm lịch mới.\n` +
      `- \`${prefix}lich-hom-nay\`: xem lịch hôm nay.\n` +
      `- \`${prefix}help\`: xem toàn bộ lệnh.`
    );
  }

  formatHelp(
    entries: HelpRenderEntry[],
    categoryOrder: string[],
    prefix: string,
  ): string {
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
        const tail = item.implemented ? "" : " 🚧";
        message += `- \`${prefix}${item.syntax}\`: ${item.description}.${tail}\n`;
      }
      message += `\n`;
    }

    message += `💡 Chú thích: 🚧 = sắp ra mắt.`;
    return message;
  }

  formatScheduleList(schedules: Schedule[], title: string): string {
    if (schedules.length === 0) {
      return `📅 **${title}**\n\nKhông có lịch nào.`;
    }

    let message = `📅 **${title}**\n\n`;
    const statusGroups: Array<{ status: ScheduleStatus; title: string }> = [
      { status: "pending", title: "Đang chờ" },
      { status: "completed", title: "Đã hoàn thành" },
      { status: "cancelled", title: "Đã hủy" },
    ];

    for (const group of statusGroups) {
      const items = schedules.filter(
        (schedule) => schedule.status === group.status,
      );
      if (!items.length) {
        continue;
      }

      message += `${this.getStatusIcon(group.status)} ${group.title}:\n`;
      items.forEach((schedule, index) => {
        message += this.formatScheduleDetailLine(schedule, index + 1);
      });
      message += "\n";
    }

    return message.trimEnd();
  }

  formatWeeklySchedule(
    schedules: Schedule[],
    title: string,
    weekStart: Date,
  ): string {
    if (schedules.length === 0) {
      return `📆 **${title}**\n\nKhông có lịch nào.`;
    }

    const schedulesByDate = new Map<string, Schedule[]>();
    for (const schedule of schedules) {
      const key = formatDateShort(schedule.start_time);
      const list = schedulesByDate.get(key) ?? [];
      list.push(schedule);
      schedulesByDate.set(key, list);
    }

    const dayNames = [
      "Thứ 2",
      "Thứ 3",
      "Thứ 4",
      "Thứ 5",
      "Thứ 6",
      "Thứ 7",
      "Chủ nhật",
    ];
    let message = `📆 **${title}**\n\n`;

    for (let i = 0; i < 7; i += 1) {
      const day = new Date(
        weekStart.getFullYear(),
        weekStart.getMonth(),
        weekStart.getDate() + i,
      );
      const key = formatDateShort(day);
      const daySchedules = schedulesByDate.get(key);
      if (!daySchedules?.length) {
        continue;
      }

      message += `📌 ${dayNames[i]} (${formatDateNoYear(day)}):\n`;
      for (const schedule of daySchedules) {
        message += this.formatScheduleCompactLine(schedule, "  ");
      }
      message += "\n";
    }

    return message.trimEnd();
  }

  formatInvalidDate(input: string, prefix: string, command: string): string {
    return (
      `⚠️ Ngày \`${input}\` không hợp lệ.\n` +
      `Vui lòng nhập theo định dạng \`DD-MM-YYYY\`, ví dụ: \`${prefix}${command} 21-4-2026\`.`
    );
  }

  formatNotInitialized(prefix: string): string {
    return (
      `⚠️ Bạn chưa khởi tạo tài khoản.\n` +
      `Vui lòng dùng lệnh \`${prefix}batdau\` để bắt đầu sử dụng bot.`
    );
  }

  private formatScheduleDetailLine(schedule: Schedule, index: number): string {
    const statusIcon = this.getStatusIcon(schedule.status);
    const endTime = schedule.end_time
      ? ` - ${formatTime(schedule.end_time)}`
      : "";
    let message = `${statusIcon} **${index}. ${schedule.title}**\n`;
    message += `   ⏰ ${formatTime(schedule.start_time)}${endTime}\n`;
    if (schedule.description) {
      message += `   📝 ${schedule.description}\n`;
    }
    message += `   🆔 ID: \`${schedule.id}\`\n`;
    return message;
  }

  private formatScheduleCompactLine(schedule: Schedule, indent = ""): string {
    const statusIcon = this.getStatusIcon(schedule.status);
    const endTime = schedule.end_time
      ? ` - ${formatTime(schedule.end_time)}`
      : "";
    const description = schedule.description
      ? `\n${indent}   📝 ${schedule.description}`
      : "";

    return (
      `${indent}${statusIcon} ${formatTime(schedule.start_time)}${endTime} - ${schedule.title}` +
      `${description}\n`
    );
  }

  private getStatusIcon(status: ScheduleStatus): string {
    switch (status) {
      case "completed":
        return "✅";
      case "cancelled":
        return "🚫";
      case "pending":
      default:
        return "⏳";
    }
  }
}
