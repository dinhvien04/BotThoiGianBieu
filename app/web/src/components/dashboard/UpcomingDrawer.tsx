"use client";

import { useState } from "react";
import Link from "next/link";

interface UpcomingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const mockEvents = [
  { id: 1, title: "Họp chiến lược quý 4", time: "09:30 - 10:30", location: "Sân thượng tòa nhà", priority: "high", tags: ["Marketing"] },
  { id: 2, title: "Kiểm tra UI cho Drawer", time: "13:00 - 14:00", location: "Trực tuyến", priority: "medium", tags: ["Design"] },
  { id: 3, title: "Gửi báo cáo tuần cho sếp", time: "16:45 - 17:00", location: "Email", priority: "low", tags: ["Báo cáo"] },
];

const priorityBadge: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: "bg-error-container/50", text: "text-on-error-container", label: "HIGH" },
  medium: { bg: "bg-yellow-100", text: "text-yellow-700", label: "MEDIUM" },
  low: { bg: "bg-gray-100", text: "text-gray-600", label: "LOW" },
};

export default function UpcomingDrawer({ isOpen, onClose }: UpcomingDrawerProps) {
  const [filter, setFilter] = useState<"24h" | "7d">("24h");

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-outline-variant/50">
          <h2 className="text-lg font-bold text-on-surface">Lịch sắp tới</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-container transition-colors">
            <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Time filter */}
        <div className="flex p-3 gap-2 border-b border-outline-variant/30">
          {(["24h", "7d"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === f ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"
              }`}
            >
              {f === "24h" ? "24 giờ" : "7 ngày"}
            </button>
          ))}
        </div>

        {/* Events */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {mockEvents.map((event) => {
            const badge = priorityBadge[event.priority];
            return (
              <div key={event.id} className="bg-white border border-outline-variant/50 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                    {event.tags.map((tag) => (
                      <span key={tag} className="text-xs text-primary font-medium">#{tag}</span>
                    ))}
                  </div>
                  <button className="p-1 text-on-surface-variant hover:text-primary">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                  </button>
                </div>
                <h3 className="font-semibold text-on-surface text-sm">{event.title}</h3>
                <p className="text-xs text-on-surface-variant mt-1">{event.time} • {event.location}</p>
                <div className="flex items-center gap-2 mt-3">
                  <button className="p-1.5 rounded-lg bg-surface-container hover:bg-primary/10 transition-colors text-on-surface-variant hover:text-primary">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </button>
                  <button className="p-1.5 rounded-lg bg-surface-container hover:bg-primary/10 transition-colors text-on-surface-variant hover:text-primary">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </button>
                  <Link
                    href={`/lich/${event.id}`}
                    className="ml-auto text-xs text-primary font-medium flex items-center gap-1 hover:underline"
                  >
                    Chi tiết
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            );
          })}

          {/* Empty tail */}
          <div className="bg-surface-container-low rounded-xl p-6 text-center">
            <svg className="w-10 h-10 text-on-surface-variant/30 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <p className="text-sm text-on-surface-variant">Không còn lịch trình nào khác</p>
            <Link href="/lich/tao-moi" className="text-xs text-primary font-medium hover:underline mt-1 inline-block">
              Tạo lịch mới
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-outline-variant/50">
          <Link
            href="/lich/tao-moi"
            className="w-full py-3 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Thêm lịch trình mới
          </Link>
        </div>
      </div>
    </>
  );
}
