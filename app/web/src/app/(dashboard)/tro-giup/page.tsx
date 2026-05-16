"use client";

import { useState } from "react";

const faqItems = [
  { q: "Làm thế nào để tạo lịch mới?", a: "Nhấn nút \"Tạo mới\" ở sidebar hoặc vào trang Lịch của tôi → nhấn nút \"+\" ở góc trên. Bạn cũng có thể dùng lệnh *them-lich trên Mezon." },
  { q: "Làm sao để đặt nhắc nhở cho sự kiện?", a: "Mở chi tiết sự kiện → phần Nhắc nhở → chọn thời gian nhắc (15 phút, 30 phút, 1 giờ trước). Trên Mezon, dùng lệnh *nhac <ID> <phút>." },
  { q: "Cách import lịch từ Excel?", a: "Vào trang Nhập & Xuất → tab Nhập dữ liệu → kéo thả file .xlsx hoặc .csv. Trên Mezon, dùng lệnh *them-lich-excel." },
  { q: "Làm sao để chia sẻ lịch với đồng nghiệp?", a: "Mở chi tiết sự kiện → nhấn nút \"Chia sẻ\" → chọn người nhận từ danh bạ hoặc nhập email." },
  { q: "Cách thiết lập lịch lặp lại?", a: "Mở chi tiết sự kiện → nhấn \"Cài đặt lặp\" → chọn tần suất (hàng ngày, hàng tuần, hàng tháng) và ngày kết thúc." },
  { q: "Làm sao kết nối với Mezon?", a: "Vào Cài đặt → Tích hợp → nhấn \"Kết nối Mezon\". Bạn cần có tài khoản Mezon để sử dụng bot." },
];

const shortcutItems = [
  { keys: ["*lich-hom-nay"], desc: "Xem lịch hôm nay" },
  { keys: ["*them-lich"], desc: "Thêm lịch mới (form interactive)" },
  { keys: ["*chi-tiet", "<ID>"], desc: "Xem chi tiết lịch" },
  { keys: ["*sap-toi", "[N]"], desc: "Xem N lịch sắp tới" },
  { keys: ["*thong-ke"], desc: "Xem thống kê năng suất" },
  { keys: ["*tim-kiem", "<từ khóa>"], desc: "Tìm kiếm lịch" },
  { keys: ["*help"], desc: "Hiển thị trợ giúp" },
];

export default function HelpPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [searchQ, setSearchQ] = useState("");

  const filtered = searchQ
    ? faqItems.filter((f) => f.q.toLowerCase().includes(searchQ.toLowerCase()) || f.a.toLowerCase().includes(searchQ.toLowerCase()))
    : faqItems;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Trung tâm trợ giúp</h1>
        <p className="text-sm text-on-surface-variant mt-1">Tìm câu trả lời nhanh và hướng dẫn sử dụng.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Tìm kiếm câu hỏi..."
          className="w-full pl-12 pr-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FAQ */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-bold text-on-surface">Câu hỏi thường gặp</h2>
          {filtered.map((item, i) => (
            <div key={i} className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <span className="font-medium text-on-surface text-sm">{item.q}</span>
                <svg className={`w-5 h-5 text-on-surface-variant shrink-0 transition-transform ${openIdx === i ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {openIdx === i && (
                <div className="px-4 pb-4 text-sm text-on-surface-variant border-t border-surface-container-high pt-3">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick Links + Bot Commands */}
        <div className="space-y-6">
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-on-surface mb-4">Liên kết nhanh</h3>
            <div className="space-y-2">
              {[
                { label: "Hướng dẫn bắt đầu", icon: "🚀" },
                { label: "Video hướng dẫn", icon: "🎬" },
                { label: "Changelog", icon: "📋" },
                { label: "Liên hệ hỗ trợ", icon: "💬" },
              ].map((link) => (
                <button key={link.label} className="w-full flex items-center gap-3 p-3 bg-surface-container-low rounded-xl hover:bg-surface-container transition-colors text-left">
                  <span>{link.icon}</span>
                  <span className="text-sm font-medium text-on-surface">{link.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-on-surface mb-4">Lệnh Mezon Bot</h3>
            <div className="space-y-2">
              {shortcutItems.map((cmd) => (
                <div key={cmd.desc} className="flex items-start gap-2">
                  <code className="text-xs bg-surface-container px-1.5 py-0.5 rounded font-mono text-primary whitespace-nowrap">
                    {cmd.keys.join(" ")}
                  </code>
                  <span className="text-xs text-on-surface-variant">{cmd.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
