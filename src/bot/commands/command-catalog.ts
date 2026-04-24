/**
 * Danh mục tĩnh của toàn bộ lệnh bot (đã implement + chưa implement).
 * File này là "single source of truth" cho `*help`.
 *
 * Quy ước:
 *   - `name` phải khớp với `command.name` (hoặc alias) trong registry để
 *     HelpCommand có thể auto-detect đã implement hay chưa.
 *   - Một `name` có thể xuất hiện nhiều lần với `syntax` khác nhau để minh
 *     họa các cách dùng (vd: `lich-ngay` và `lich-ngay 21-4-2026`).
 */

export interface CatalogEntry {
  name: string;
  syntax: string;
  description: string;
  category: string;
}

export const COMMAND_CATALOG: CatalogEntry[] = [
  // ===== 🆕 Khởi tạo =====
  {
    name: "bat-dau",
    syntax: "batdau",
    description: "Khởi tạo người dùng",
    category: "🆕 KHỞI TẠO",
  },

  // ===== 📅 Xem lịch =====
  {
    name: "lich-hom-nay",
    syntax: "lich-hom-nay",
    description: "Xem lịch hôm nay",
    category: "📅 XEM LỊCH",
  },
  {
    name: "lich-ngay",
    syntax: "lich-ngay",
    description: "Xem lịch theo ngày hôm nay",
    category: "📅 XEM LỊCH",
  },
  {
    name: "lich-ngay",
    syntax: "lich-ngay 21-4-2026",
    description: "Xem lịch theo ngày cụ thể",
    category: "📅 XEM LỊCH",
  },
  {
    name: "lich-tuan",
    syntax: "lich-tuan",
    description: "Xem lịch tuần này",
    category: "📅 XEM LỊCH",
  },
  {
    name: "lich-tuan",
    syntax: "lich-tuan 21-4-2026",
    description: "Xem lịch của tuần chứa ngày được nhập",
    category: "📅 XEM LỊCH",
  },
  {
    name: "lich-tuan-truoc",
    syntax: "lich-tuan-truoc",
    description: "Xem lịch tuần trước",
    category: "📅 XEM LỊCH",
  },
  {
    name: "lich-tuan-sau",
    syntax: "lich-tuan-sau",
    description: "Xem lịch tuần sau",
    category: "📅 XEM LỊCH",
  },
  {
    name: "chi-tiet",
    syntax: "chi-tiet <ID>",
    description: "Xem chi tiết lịch",
    category: "📅 XEM LỊCH",
  },

  // ===== ✏️ Quản lý lịch =====
  {
    name: "them-lich",
    syntax: "them-lich",
    description: "Thêm lịch mới",
    category: "✏️ QUẢN LÝ LỊCH",
  },
  {
    name: "sua-lich",
    syntax: "sua-lich <ID>",
    description: "Chỉnh sửa lịch",
    category: "✏️ QUẢN LÝ LỊCH",
  },
  {
    name: "xoa-lich",
    syntax: "xoa-lich <ID>",
    description: "Xóa lịch",
    category: "✏️ QUẢN LÝ LỊCH",
  },
  {
    name: "hoan-thanh",
    syntax: "hoan-thanh <ID>",
    description: "Hoàn thành công việc",
    category: "✏️ QUẢN LÝ LỊCH",
  },

  // ===== 🔔 Nhắc nhở =====
  {
    name: "nhac",
    syntax: "nhac <ID> <số_phút>",
    description: "Đặt nhắc lịch",
    category: "🔔 NHẮC NHỞ",
  },
  {
    name: "tat-nhac",
    syntax: "tat-nhac <ID>",
    description: "Tắt nhắc lịch",
    category: "🔔 NHẮC NHỞ",
  },

  // ===== ⚙️ Cài đặt =====
  {
    name: "cai-dat",
    syntax: "cai-dat",
    description: "Xem và chỉnh cài đặt cá nhân",
    category: "⚙️ CÀI ĐẶT",
  },

  // ===== ❓ Hỗ trợ =====
  {
    name: "help",
    syntax: "help",
    description: "Xem hướng dẫn",
    category: "❓ HỖ TRỢ",
  },
];

/** Thứ tự hiển thị các category trong help. */
export const CATEGORY_ORDER: string[] = [
  "🆕 KHỞI TẠO",
  "📅 XEM LỊCH",
  "✏️ QUẢN LÝ LỊCH",
  "🔔 NHẮC NHỞ",
  "⚙️ CÀI ĐẶT",
  "❓ HỖ TRỢ",
];
