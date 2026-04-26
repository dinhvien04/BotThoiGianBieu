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
  {
    name: "sap-toi",
    syntax: "sap-toi",
    description: "Xem các lịch sắp tới gần nhất",
    category: "📅 XEM LỊCH",
  },
  {
    name: "sap-toi",
    syntax: "sap-toi 10",
    description: "Xem N lịch sắp tới (tối đa 20)",
    category: "📅 XEM LỊCH",
  },
  {
    name: "danh-sach",
    syntax: "danh-sach",
    description: "Liệt kê tất cả lịch đang chờ",
    category: "📅 XEM LỊCH",
  },
  {
    name: "danh-sach",
    syntax: "danh-sach 2",
    description: "Xem trang 2 của danh sách lịch chờ",
    category: "📅 XEM LỊCH",
  },
  {
    name: "tim-kiem",
    syntax: "tim-kiem <từ khoá>",
    description: "Tìm lịch theo từ khoá (tiêu đề / ghi chú)",
    category: "📅 XEM LỊCH",
  },
  {
    name: "thong-ke",
    syntax: "thong-ke",
    description: "Thống kê 30 ngày qua (tỉ lệ hoàn thành, giờ bận, ...)",
    category: "📅 XEM LỊCH",
  },
  {
    name: "thong-ke",
    syntax: "thong-ke tuan",
    description: "Thống kê theo khoảng (tuan | thang | nam | all)",
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
    name: "them-lich-excel",
    syntax: "them-lich-excel",
    description: "Thêm nhiều lịch từ file Excel",
    category: "✏️ QUẢN LÝ LỊCH",
  },
  {
    name: "mau-lich-excel",
    syntax: "mau-lich-excel",
    description: "Tải file Excel mẫu để nhập lịch hàng loạt",
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
  {
    name: "lich-lap",
    syntax: "lich-lap <ID> <daily|weekly|monthly> [interval] [--den DD/MM/YYYY]",
    description: "Bật lặp cho lịch (hàng ngày / tuần / tháng)",
    category: "✏️ QUẢN LÝ LỊCH",
  },
  {
    name: "bo-lap",
    syntax: "bo-lap <ID>",
    description: "Tắt lặp cho lịch",
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
    name: "nhac-sau",
    syntax: "nhac-sau <ID> <thời gian>",
    description: "Nhắc sau X phút/giờ/ngày (vd: 30p, 2h, 1d, 2h30p)",
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
