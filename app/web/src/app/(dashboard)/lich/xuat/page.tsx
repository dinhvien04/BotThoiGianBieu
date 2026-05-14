"use client";

import { useState } from "react";
import Link from "next/link";

type ExportFormat = "xlsx" | "ics" | "pdf";

const formats: { key: ExportFormat; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  {
    key: "xlsx",
    label: "Excel (.xlsx)",
    desc: "Xuất bảng tính đầy đủ, hỗ trợ tính toán và phân tích sâu.",
    icon: (
      <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12c-.621 0-1.125.504-1.125 1.125M12 12c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0c0 .621.504 1.125 1.125 1.125" />
      </svg>
    ),
    color: "bg-green-50 border-green-200",
  },
  {
    key: "ics",
    label: "ICS (.ics)",
    desc: "Tương thích hoàn hảo với Google Calendar, Outlook và Apple Calendar.",
    icon: (
      <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    color: "bg-blue-50 border-blue-200",
  },
  {
    key: "pdf",
    label: "PDF",
    desc: "Báo cáo lịch trình dạng in ấn, đẹp mắt và không thể chỉnh sửa.",
    icon: (
      <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    color: "bg-red-50 border-red-200",
  },
];

export default function ExportPage() {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("xlsx");
  const [dateFrom, setDateFrom] = useState("2025-01-01");
  const [dateTo, setDateTo] = useState("2025-05-31");
  const [statuses, setStatuses] = useState({ pending: true, completed: true, cancelled: false });
  const [priorities, setPriorities] = useState({ high: true, medium: true, low: true });

  const toggleStatus = (key: keyof typeof statuses) => setStatuses((s) => ({ ...s, [key]: !s[key] }));
  const togglePriority = (key: keyof typeof priorities) => setPriorities((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
        <Link href="/lich" className="hover:text-primary transition-colors">Lịch của tôi</Link>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-primary font-medium">Xuất dữ liệu</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-on-surface">Xuất lịch trình</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Tùy chỉnh các thông số và định dạng tệp để lưu trữ hoặc chia sẻ lịch làm việc của bạn.
        </p>
      </div>

      {/* Format Selection */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
          <h2 className="font-bold text-on-surface">Chọn định dạng xuất</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {formats.map((f) => (
            <button
              key={f.key}
              onClick={() => setSelectedFormat(f.key)}
              className={`rounded-xl p-5 text-left border-2 transition-all ${
                selectedFormat === f.key
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : `${f.color} hover:border-primary/30`
              }`}
            >
              <div className="mb-3">{f.icon}</div>
              <p className="font-semibold text-on-surface">{f.label}</p>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{f.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
          <h2 className="font-bold text-on-surface">Bộ lọc xuất</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Date Range */}
          <div>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Khoảng thời gian</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-on-surface-variant mb-1 block">Từ ngày</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs text-on-surface-variant mb-1 block">Đến ngày</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Trạng thái</p>
            <div className="space-y-2.5">
              {([["pending", "Đang chờ"], ["completed", "Hoàn thành"], ["cancelled", "Đã hủy"]] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={statuses[key]}
                    onChange={() => toggleStatus(key)}
                    className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/30"
                  />
                  <span className="text-sm text-on-surface">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Mức ưu tiên</p>
            <div className="space-y-2.5">
              {([["high", "Cao"], ["medium", "Vừa"], ["low", "Thấp"]] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={priorities[key]}
                    onChange={() => togglePriority(key)}
                    className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/30"
                  />
                  <span className="text-sm text-on-surface">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary & Action */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-3 flex items-center gap-3">
        <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-sm text-on-surface">
          Sẽ xuất <span className="font-bold">45</span> lịch trình từ <span className="font-bold">{dateFrom.split("-").reverse().join("/")}</span> đến <span className="font-bold">{dateTo.split("-").reverse().join("/")}</span>
        </p>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Link
          href="/lich"
          className="px-6 py-2.5 border border-outline-variant rounded-xl text-on-surface font-medium text-sm hover:bg-surface-container transition-colors"
        >
          Hủy
        </Link>
        <button className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Xuất file
        </button>
      </div>
    </div>
  );
}
