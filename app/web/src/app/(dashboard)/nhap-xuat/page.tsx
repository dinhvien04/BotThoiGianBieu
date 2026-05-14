"use client";

import { useState } from "react";

export default function ImportExportPage() {
  const [activeTab, setActiveTab] = useState<"import" | "export">("import");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Nhập & Xuất dữ liệu</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Quản lý dữ liệu lịch trình, nhập từ file hoặc xuất báo cáo.
        </p>
      </div>

      <div className="flex gap-1 bg-surface-container rounded-xl p-1">
        <button
          onClick={() => setActiveTab("import")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "import" ? "bg-white text-on-surface shadow-sm" : "text-on-surface-variant"}`}
        >
          Nhập dữ liệu
        </button>
        <button
          onClick={() => setActiveTab("export")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "export" ? "bg-white text-on-surface shadow-sm" : "text-on-surface-variant"}`}
        >
          Xuất dữ liệu
        </button>
      </div>

      {activeTab === "import" && (
        <div className="space-y-4">
          {/* Drop Zone */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border-2 border-dashed border-outline-variant hover:border-primary/40 transition-colors cursor-pointer">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <p className="font-medium text-on-surface">Kéo thả file vào đây hoặc nhấn để chọn</p>
              <p className="text-sm text-on-surface-variant mt-1">Hỗ trợ: .xlsx, .csv, .ics</p>
            </div>
          </div>

          {/* Format Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { format: "Excel (.xlsx)", desc: "Import từ bảng tính Excel", icon: "📊", color: "#27AE60" },
              { format: "CSV (.csv)", desc: "Import từ file CSV", icon: "📄", color: "#2196F3" },
              { format: "iCalendar (.ics)", desc: "Import từ Google Calendar, Outlook", icon: "📅", color: "#F2994A" },
            ].map((item) => (
              <button key={item.format} className="bg-white rounded-2xl p-5 shadow-sm text-left hover:shadow-md transition-shadow">
                <span className="text-2xl">{item.icon}</span>
                <p className="font-medium text-on-surface mt-3">{item.format}</p>
                <p className="text-xs text-on-surface-variant mt-1">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === "export" && (
        <div className="space-y-4">
          {[
            { format: "Excel (.xlsx)", desc: "Xuất toàn bộ lịch trình dạng bảng tính", icon: "📊", color: "#27AE60" },
            { format: "CSV (.csv)", desc: "Xuất dữ liệu dạng CSV, dễ dàng xử lý", icon: "📄", color: "#2196F3" },
            { format: "iCalendar (.ics)", desc: "Xuất để import vào Google Calendar, Outlook", icon: "📅", color: "#F2994A" },
            { format: "PDF Report", desc: "Xuất báo cáo năng suất dạng PDF", icon: "📋", color: "#EB5757" },
          ].map((item) => (
            <div key={item.format} className="bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="font-medium text-on-surface">{item.format}</p>
                  <p className="text-sm text-on-surface-variant mt-0.5">{item.desc}</p>
                </div>
              </div>
              <button className="px-5 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Tải xuống
              </button>
            </div>
          ))}

          {/* Export Options */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-on-surface mb-4">Tùy chọn xuất</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">Khoảng thời gian</label>
                <select className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                  <option>Tất cả</option>
                  <option>Tuần này</option>
                  <option>Tháng này</option>
                  <option>Tháng trước</option>
                  <option>Quý này</option>
                  <option>Năm nay</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">Loại sự kiện</label>
                <select className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                  <option>Tất cả loại</option>
                  <option>Cuộc họp</option>
                  <option>Công việc</option>
                  <option>Sự kiện</option>
                  <option>Cá nhân</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
