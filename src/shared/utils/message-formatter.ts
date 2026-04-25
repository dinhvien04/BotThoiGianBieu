import { Injectable } from "@nestjs/common";
import { Schedule, ScheduleStatus } from "../../schedules/entities/schedule.entity";
import { User } from "../../users/entities/user.entity";
import { UserSettings } from "../../users/entities/user-settings.entity";
import {
  formatDateNoYear,
  formatDateShort,
  formatTime,
} from "./date-utils";

export interface HelpRenderEntry {
  syntax: string;
  description: string;
  category: string;
  implemented: boolean;
  example?: string;
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
      ...categoryOrder.filter((category) => grouped.has(category)),
      ...[...grouped.keys()].filter(
        (category) => !categoryOrder.includes(category),
      ),
    ];

    let message = `🗺️ BOT THỜI GIAN BIỂU - DANH SÁCH LỆNH 🗺️\n\n`;

    for (const category of orderedCategories) {
      const items = grouped.get(category) ?? [];
      message += `${category}\n`;
      message += this.formatHelpCategoryBlock(items, prefix);
      message += `\n`;
    }

    message += `💡 Chú thích: 🚧 = sắp ra mắt.`;
    return message.trimEnd();
  }

  formatScheduleList(schedules: Schedule[], title: string): string {
    const header = this.formatDailyScheduleHeader(title);
    const grouped = this.groupSchedulesByStatus(schedules);
    const separator = "━━━━━━━━━━━━━━━━━━━━";

    if (schedules.length === 0) {
      return `${header}\n${separator}\n\nKhông có lịch nào.\n💡 Chúc bạn một ngày làm việc hiệu quả!`;
    }

    let message = `${header}\n${separator}\n\n`;

    const pending = grouped.get("pending") ?? [];
    if (pending.length > 0) {
      message += `${this.formatDailyStatusSection("Đang chờ", pending)}\n\n`;
    }

    const completed = grouped.get("completed") ?? [];
    if (completed.length > 0) {
      message += `${this.formatDailyStatusSection("Đã hoàn thành", completed)}\n\n`;
    }

    const cancelled = grouped.get("cancelled") ?? [];
    if (cancelled.length > 0) {
      message += `${this.formatDailyStatusSection("Đã hủy", cancelled)}\n\n`;
    }

    message += "💡 Chúc bạn một ngày làm việc hiệu quả!";
    return message.trimEnd();
  }

  formatWeeklySchedule(
    schedules: Schedule[],
    title: string,
    weekStart: Date,
  ): string {
    const header = this.formatDailyScheduleHeader(title);
    const separator = "━━━━━━━━━━━━━━━━━━━━";

    if (schedules.length === 0) {
      return `${header}\n${separator}\n\nKhông có lịch nào.\n💡 Chúc bạn một ngày làm việc hiệu quả!`;
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

    const sections: string[] = [header, separator];

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

      const dayGrouped = this.groupSchedulesByStatus(daySchedules);
      const daySection: string[] = [`❖ ${dayNames[i]} (${formatDateNoYear(day)})`];

      const pending = dayGrouped.get("pending") ?? [];
      if (pending.length > 0) {
        daySection.push(this.formatDailyStatusSection("Đang chờ", pending));
      }

      const completed = dayGrouped.get("completed") ?? [];
      if (completed.length > 0) {
        daySection.push(this.formatDailyStatusSection("Đã hoàn thành", completed));
      }

      const cancelled = dayGrouped.get("cancelled") ?? [];
      if (cancelled.length > 0) {
        daySection.push(this.formatDailyStatusSection("Đã hủy", cancelled));
      }

      sections.push(daySection.join("\n\n"));
    }

    sections.push("💡 Chúc bạn một ngày làm việc hiệu quả!");
    return sections.join("\n\n").trimEnd();
  }

  /**
   * Render danh sách lịch dạng "digest" — mỗi lịch 1 dòng có ID + ngày + giờ
   * bắt đầu + tiêu đề + trạng thái. Dùng cho các view span nhiều ngày
   * (tim-kiem, sap-toi, danh-sach) khi không cần group theo ngày.
   */
  formatScheduleDigest(
    schedules: Schedule[],
    title: string,
    opts?: { emptyMessage?: string; footer?: string },
  ): string {
    const header = `【 ${title.toUpperCase()} 】`;
    const separator = "━━━━━━━━━━━━━━━━━━━━";

    if (schedules.length === 0) {
      const empty = opts?.emptyMessage ?? "Không có lịch nào.";
      return `${header}\n${separator}\n\n${empty}`;
    }

    const items = schedules.map((schedule) => {
      const when = `${formatDateShort(schedule.start_time)} ${formatTime(schedule.start_time)}`;
      const statusLabel = this.formatStatusLabel(schedule.status);
      const recurringBadge =
        schedule.recurrence_type && schedule.recurrence_type !== "none"
          ? " 🔁"
          : "";
      const lines = [
        `➤ 『 ${when} 』 **${schedule.title}**${recurringBadge} — ${statusLabel}`,
      ];
      if (schedule.description) {
        lines.push(`   ID: ${schedule.id} ✦ Ghi chú: ${schedule.description}`);
      } else {
        lines.push(`   ID: ${schedule.id}`);
      }
      return lines.join("\n");
    });

    const sections = [header, separator, items.join("\n\n")];
    if (opts?.footer) {
      sections.push(opts.footer);
    }
    return sections.join("\n\n").trimEnd();
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

  private formatDailyScheduleHeader(title: string): string {
    const normalized = title.trim();
    const lower = normalized.toLowerCase();

    if (
      lower.includes("ngày hôm nay") ||
      lower.includes("hôm nay") ||
      lower.includes("hom nay")
    ) {
      return "【 LỊCH TRÌNH HÔM NAY 】";
    }

    const upper = normalized.toUpperCase();
    if (upper.startsWith("LỊCH ")) {
      return `【 LỊCH TRÌNH ${upper.slice(5).trim()} 】`;
    }

    return `【 ${upper} 】`;
  }

  private formatDailyStatusSection(
    statusLabel: string,
    schedules: Schedule[],
  ): string {
    const items = schedules.map((schedule) =>
      this.formatDailyScheduleItem(schedule),
    );

    return `❖ Trạng thái: ${statusLabel} (${schedules.length})\n\n${items.join("\n\n")}`;
  }

  private formatDailyScheduleItem(schedule: Schedule): string {
    const lines = [
      `➤ 『 ${formatTime(schedule.start_time)} 』 **${schedule.title}**`,
    ];

    if (schedule.description) {
      lines.push(`   ID: ${schedule.id} ✦ Ghi chú: ${schedule.description}`);
    } else {
      lines.push(`   ID: ${schedule.id}`);
    }

    return lines.join("\n");
  }

  private formatStatusLabel(status: ScheduleStatus): string {
    switch (status) {
      case "completed":
        return "Đã hoàn thành";
      case "cancelled":
        return "Đã hủy";
      case "pending":
      default:
        return "Đang chờ";
    }
  }

  private groupSchedulesByStatus(schedules: Schedule[]): Map<ScheduleStatus, Schedule[]> {
    const grouped = new Map<ScheduleStatus, Schedule[]>();
    for (const schedule of schedules) {
      const list = grouped.get(schedule.status) ?? [];
      list.push(schedule);
      grouped.set(schedule.status, list);
    }
    return grouped;
  }

  private formatHelpCategoryBlock(
    items: HelpRenderEntry[],
    prefix: string,
  ): string {
    if (items.length === 0) return "";

    // Mỗi dòng: "- `*cmd`: description. 🚧" — dùng backtick inline cho Mezon render.
    const lines = items.map((item) => {
      const tail = item.implemented ? "" : " 🚧";
      const description = item.description.endsWith(".")
        ? item.description
        : `${item.description}.`;
      const example = item.example
        ? `\n   Ví dụ: \`${prefix}${item.example}\``
        : "";
      return `- ${prefix}${item.syntax}: ${description}${tail}${example}`;
    });

    return lines.join("\n");
  }
}
