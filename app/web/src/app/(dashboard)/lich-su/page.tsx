"use client";

import { useState } from "react";

interface HistoryEntry {
  id: number;
  time: string;
  action: string;
  actionType: "create" | "update" | "delete" | "complete";
  target: string;
  detail: string;
}

const historyData: HistoryEntry[] = [
  { id: 1, time: "10:45 AM, 24/10/2024", action: "Hoàn thành", actionType: "complete", target: "Thiết kế UI Dashboard", detail: "Đã đánh dấu hoàn thành" },
  { id: 2, time: "10:30 AM, 24/10/2024", action: "Cập nhật", actionType: "update", target: "Họp đầu tuần Team Marketing", detail: "Thay đổi phòng họp: Phòng 01 → Phòng 02" },
  { id: 3, time: "09:15 AM, 24/10/2024", action: "Tạo mới", actionType: "create", target: "Deep Work (Tập trung cao)", detail: "Sự kiện mới được thêm" },
  { id: 4, time: "08:12 AM, 24/10/2024", action: "Cập nhật", actionType: "update", target: "Viết tài liệu API NestJS", detail: "Cập nhật mức độ ưu tiên: Trung bình → Cao" },
  { id: 5, time: "05:00 PM, 23/10/2024", action: "Xóa", actionType: "delete", target: "Gọi điện nhà cung cấp", detail: "Sự kiện đã bị xóa" },
  { id: 6, time: "04:30 PM, 23/10/2024", action: "Hoàn thành", actionType: "complete", target: "Review Sprint Q3", detail: "Đã đánh dấu hoàn thành" },
  { id: 7, time: "02:00 PM, 23/10/2024", action: "Tạo mới", actionType: "create", target: "Phỏng vấn ứng viên Senior Designer", detail: "Sự kiện mới được thêm" },
  { id: 8, time: "11:00 AM, 23/10/2024", action: "Cập nhật", actionType: "update", target: "Kick-off dự án SmartHome 2.0", detail: "Thêm 2 người tham gia" },
  { id: 9, time: "09:30 AM, 22/10/2024", action: "Tạo mới", actionType: "create", target: "Chuẩn bị nội dung Workshop", detail: "Sự kiện mới được thêm" },
  { id: 10, time: "08:00 AM, 22/10/2024", action: "Hoàn thành", actionType: "complete", target: "Gặp đối tác dự án ABC", detail: "Đã đánh dấu hoàn thành" },
];

const actionConfig: Record<string, { color: string; bg: string; icon: string }> = {
  create: { color: "#2196F3", bg: "#2196F3", icon: "+" },
  update: { color: "#F2994A", bg: "#F2994A", icon: "↻" },
  delete: { color: "#EB5757", bg: "#EB5757", icon: "×" },
  complete: { color: "#27AE60", bg: "#27AE60", icon: "✓" },
};

export default function HistoryPage() {
  const [filterType, setFilterType] = useState<"all" | "create" | "update" | "delete" | "complete">("all");

  const filtered = filterType === "all" ? historyData : historyData.filter((h) => h.actionType === filterType);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Lịch sử thay đổi</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Theo dõi tất cả các hành động trên hệ thống.
          </p>
        </div>
        <button className="px-5 py-2.5 border border-outline-variant rounded-xl text-on-surface font-medium text-sm hover:bg-surface-container transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Xuất nhật ký
        </button>
      </div>

      <div className="flex gap-2">
        {(["all", "create", "update", "complete", "delete"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filterType === type ? "bg-primary text-white" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {type === "all" ? "Tất cả" : type === "create" ? "Tạo mới" : type === "update" ? "Cập nhật" : type === "complete" ? "Hoàn thành" : "Xóa"}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm">
        <div className="relative pl-8">
          <div className="absolute left-[18px] top-0 bottom-0 w-px bg-surface-container-high" />
          {filtered.map((entry, idx) => {
            const config = actionConfig[entry.actionType];
            return (
              <div key={entry.id} className={`relative flex gap-4 py-4 px-4 ${idx < filtered.length - 1 ? "border-b border-surface-container-high" : ""}`}>
                <div
                  className="absolute left-0 top-5 w-[18px] h-[18px] rounded-full flex items-center justify-center text-white text-xs font-bold -translate-x-1/2 z-10"
                  style={{ backgroundColor: config.bg, left: "18px" }}
                >
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0 ml-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-on-surface">{entry.target}</span>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: config.color }}
                    >
                      {entry.action}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant mt-1">{entry.detail}</p>
                  <p className="text-xs text-on-surface-variant/60 mt-1.5">
                    <svg className="w-3.5 h-3.5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {entry.time}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
