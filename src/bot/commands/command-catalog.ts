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
    name: "lich-thang",
    syntax: "lich-thang",
    description: "Xem lịch cả tháng này",
    category: "📅 XEM LỊCH",
  },
  {
    name: "lich-thang",
    syntax: "lich-thang 4-2026",
    description: "Xem lịch của tháng cụ thể (MM-YYYY)",
    category: "📅 XEM LỊCH",
  },
  {
    name: "export-ics",
    syntax: "export-ics [DD-MM-YYYY DD-MM-YYYY | tat-ca]",
    description: "Xuất lịch ra file .ics (Google/Apple Calendar)",
    category: "📅 XEM LỊCH",
  },
  {
    name: "import-ics",
    syntax: "import-ics [url]",
    description: "Nhập lịch từ file .ics (Google/Apple Calendar)",
    category: "✏️ QUẢN LÝ LỊCH",
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
    name: "lich-tre",
    syntax: "lich-tre [trang] [--uutien ...]",
    description: "Liệt kê lịch quá hạn (đã qua giờ bắt đầu, chưa hoàn thành)",
    category: "📅 XEM LỊCH",
  },
  {
    name: "lich-su",
    syntax: "lich-su <ID> [trang]",
    description: "Xem lịch sử thay đổi của một lịch (tạo / sửa / hoàn-thành / xoá)",
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
    name: "nhanh",
    syntax: 'nhanh <câu mô tả>',
    description: "Quick add lịch bằng câu tiếng Việt (vd: họp team 9h sáng mai)",
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
    name: "hoan-tac",
    syntax: "hoan-tac",
    description: "Hoàn tác thao tác xoá / hoàn-thành gần nhất (≤10 phút)",
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
  {
    name: "copy-lich",
    syntax: "copy-lich <ID> <DD-MM-YYYY>",
    description: "Sao chép lịch sang ngày khác (giữ nguyên giờ)",
    category: "✏️ QUẢN LÝ LỊCH",
  },
  {
    name: "copy-lich",
    syntax: "copy-lich <ID> <DD-MM-YYYY> <HH:mm>",
    description: "Sao chép lịch sang ngày + giờ mới",
    category: "✏️ QUẢN LÝ LỊCH",
  },

  // ===== 🏷️ Nhãn =====
  {
    name: "tag-them",
    syntax: "tag-them <name>",
    description: "Tạo nhãn mới (a-z, 0-9, -, _ ; ≤30 ký tự)",
    category: "🏷️ NHÃN",
  },
  {
    name: "tag-xoa",
    syntax: "tag-xoa <name>",
    description: "Xoá nhãn (gỡ khỏi mọi lịch)",
    category: "🏷️ NHÃN",
  },
  {
    name: "tag-ds",
    syntax: "tag-ds",
    description: "Liệt kê các nhãn của bạn",
    category: "🏷️ NHÃN",
  },
  {
    name: "tag",
    syntax: "tag <ID> <name1> [name2 ...]",
    description: "Gắn nhãn vào lịch (auto-tạo nhãn nếu chưa có)",
    category: "🏷️ NHÃN",
  },
  {
    name: "untag",
    syntax: "untag <ID> <name>",
    description: "Gỡ nhãn khỏi lịch",
    category: "🏷️ NHÃN",
  },
  {
    name: "lich-tag",
    syntax: "lich-tag <name> [--cho]",
    description: "Liệt kê lịch theo nhãn (--cho = chỉ pending)",
    category: "🏷️ NHÃN",
  },

  // ===== 👥 Chia sẻ =====
  {
    name: "chia-se",
    syntax: "chia-se <ID> <user_id>",
    description: "Chia sẻ lịch (view-only) cho user khác",
    category: "👥 CHIA SẺ",
  },
  {
    name: "bo-chia-se",
    syntax: "bo-chia-se <ID> <user_id>",
    description: "Gỡ chia sẻ lịch khỏi 1 user",
    category: "👥 CHIA SẺ",
  },
  {
    name: "chia-se-ai",
    syntax: "chia-se-ai <ID>",
    description: "Liệt kê người được chia sẻ 1 lịch",
    category: "👥 CHIA SẺ",
  },
  {
    name: "lich-chia-se",
    syntax: "lich-chia-se",
    description: "Liệt kê lịch được người khác chia sẻ cho bạn",
    category: "👥 CHIA SẺ",
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
  {
    name: "gio-lam",
    syntax: "gio-lam [start] [end] | tat",
    description: "Đặt nhanh khung giờ làm việc — reminder ngoài khung dồn về sáng hôm sau",
    category: "⚙️ CÀI ĐẶT",
  },

  // ===== 📋 Template =====
  {
    name: "tao-template",
    syntax: "tao-template <tên> <ID>",
    description: "Lưu lịch hiện có thành template",
    category: "📋 TEMPLATE",
  },
  {
    name: "tu-template",
    syntax: "tu-template <tên> <DD-MM-YYYY HH:mm>",
    description: "Tạo lịch mới từ template",
    category: "📋 TEMPLATE",
  },
  {
    name: "ds-template",
    syntax: "ds-template",
    description: "Liệt kê các template đã lưu",
    category: "📋 TEMPLATE",
  },
  {
    name: "xoa-template",
    syntax: "xoa-template <tên>",
    description: "Xoá template",
    category: "📋 TEMPLATE",
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
  "🏷️ NHÃN",
  "👥 CHIA SẺ",
  "📋 TEMPLATE",
  "🔔 NHẮC NHỞ",
  "⚙️ CÀI ĐẶT",
  "❓ HỖ TRỢ",
];
