"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface CompletionOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  eventTime?: string;
  eventDate?: string;
  streak?: number;
  completedWeek?: number;
  totalWeek?: number;
}

export default function CompletionOverlay({
  isOpen,
  onClose,
  title = "Họp chiến lược Quý 2",
  eventTime = "09:00 - 10:00",
  eventDate = "Thứ Hai 20/05/2025",
  streak = 5,
  completedWeek = 12,
  totalWeek = 16,
}: CompletionOverlayProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setAnimate(true), 100);
    } else {
      setAnimate(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const progress = totalWeek > 0 ? Math.round((completedWeek / totalWeek) * 100) : 0;
  const remaining = totalWeek - completedWeek;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white rounded-3xl w-full max-w-sm p-8 shadow-xl text-center transition-all duration-500 ${animate ? "scale-100 opacity-100" : "scale-90 opacity-0"}`}>
        {/* Sparkle decorations */}
        <div className="absolute top-6 right-12 text-primary/30">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <div className="absolute top-16 left-10 text-primary/20">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>

        {/* Checkmark */}
        <div className="w-16 h-16 bg-[#27AE60] rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-on-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        <h3 className="text-2xl font-bold text-on-surface">Tuyệt vời! Đã hoàn thành</h3>

        {/* Streak badge */}
        <div className="inline-flex items-center gap-1.5 mt-3 px-4 py-1.5 bg-[#F2994A]/10 rounded-full">
          <span className="text-base">🔥</span>
          <span className="text-sm font-medium text-[#F2994A]">Chuỗi {streak} ngày liên tiếp!</span>
        </div>

        {/* Event detail */}
        <div className="mt-5 bg-surface-container-low rounded-xl p-4 text-left">
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Sự kiện</p>
          <p className="font-semibold text-on-surface">{title}</p>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-on-surface-variant">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{eventTime}, {eventDate}</span>
          </div>
        </div>

        {/* Week progress */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-on-surface-variant mb-1.5">
            <span>Tiến độ tuần này</span>
            <span className="font-medium text-on-surface">{completedWeek}/{totalWeek} ({progress}%)</span>
          </div>
          <div className="h-2.5 bg-surface-container rounded-full overflow-hidden">
            <div className="h-full bg-[#27AE60] rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-on-surface-variant mt-2">
            Bạn đang làm rất tốt! Chỉ còn {remaining} mục tiêu nữa để hoàn thành kế hoạch tuần.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-outline-variant rounded-xl font-medium text-on-surface hover:bg-surface-container transition-colors"
          >
            Quay lại Dashboard
          </button>
          <Link
            href="/thong-ke"
            className="flex-1 py-3 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center"
          >
            Xem thống kê
          </Link>
        </div>
      </div>
    </div>
  );
}
