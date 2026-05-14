"use client";

import Link from "next/link";
import { mockSchedules, typeColors } from "@/lib/mock-data";

interface UpcomingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpcomingDrawer({ isOpen, onClose }: UpcomingDrawerProps) {
  const upcoming = mockSchedules
    .filter((s) => s.status !== "hoan-thanh")
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 8);

  return (
    <>
      {/* Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-xl z-50 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-container-high">
          <h2 className="text-lg font-bold text-on-surface">Lịch sắp tới</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container transition-colors">
            <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Events */}
        <div className="overflow-y-auto h-[calc(100%-70px)] p-4 space-y-3">
          {upcoming.map((event) => {
            const start = new Date(event.start);
            const diffMs = start.getTime() - new Date("2024-10-24").getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            let timeLabel = "";
            if (diffDays === 0) timeLabel = "Hôm nay";
            else if (diffDays === 1) timeLabel = "Ngày mai";
            else if (diffDays < 0) timeLabel = `${Math.abs(diffDays)} ngày trước`;
            else timeLabel = `${diffDays} ngày nữa`;

            return (
              <Link
                key={event.id}
                href={`/lich/${event.id}`}
                onClick={onClose}
                className="block bg-surface-container-low rounded-xl p-4 hover:bg-surface-container transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-1 h-full min-h-[40px] rounded-full shrink-0"
                    style={{ backgroundColor: typeColors[event.type] || "#6750A4" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-on-surface text-sm">{event.title}</p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      {" • "}
                      {timeLabel}
                    </p>
                    {event.location && (
                      <p className="text-xs text-on-surface-variant/60 mt-0.5 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        {event.location}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                      event.priority === "cao"
                        ? "bg-error/10 text-error"
                        : event.priority === "trung-binh"
                        ? "bg-[#F2994A]/10 text-[#F2994A]"
                        : "bg-[#27AE60]/10 text-[#27AE60]"
                    }`}
                  >
                    {event.priority === "cao" ? "Cao" : event.priority === "trung-binh" ? "Trung bình" : "Thấp"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
