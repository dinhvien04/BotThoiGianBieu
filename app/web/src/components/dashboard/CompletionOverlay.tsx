"use client";

import { useEffect, useState } from "react";

interface CompletionOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  streak?: number;
  completedToday?: number;
  totalToday?: number;
}

export default function CompletionOverlay({
  isOpen,
  onClose,
  title = "Sự kiện",
  streak = 5,
  completedToday = 3,
  totalToday = 5,
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

  const progress = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;
  const circumference = 2 * Math.PI * 40;
  const dashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white rounded-3xl w-full max-w-sm p-8 shadow-xl text-center transition-all duration-500 ${animate ? "scale-100 opacity-100" : "scale-90 opacity-0"}`}>
        {/* Checkmark */}
        <div className="relative w-28 h-28 mx-auto mb-6">
          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#E8E0F0" strokeWidth="6" />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#27AE60"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashoffset}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-[#27AE60] rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-bold text-on-surface">Hoàn thành!</h3>
        <p className="text-sm text-on-surface-variant mt-1">&ldquo;{title}&rdquo; đã được đánh dấu hoàn thành.</p>

        {/* Streak */}
        <div className="mt-5 bg-[#F2994A]/10 rounded-xl p-3 flex items-center justify-center gap-2">
          <span className="text-xl">🔥</span>
          <span className="text-sm font-medium text-[#F2994A]">{streak} ngày liên tiếp hoàn thành!</span>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-on-surface-variant mb-1.5">
            <span>Tiến độ hôm nay</span>
            <span className="font-medium text-on-surface">{completedToday}/{totalToday}</span>
          </div>
          <div className="h-2 bg-surface-container rounded-full overflow-hidden">
            <div className="h-full bg-[#27AE60] rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <button onClick={onClose} className="mt-6 w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors">
          Tiếp tục
        </button>
      </div>
    </div>
  );
}
