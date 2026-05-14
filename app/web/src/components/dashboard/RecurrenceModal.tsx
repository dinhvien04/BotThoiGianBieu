"use client";

import { useState } from "react";

interface RecurrenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle?: string;
}

export default function RecurrenceModal({ isOpen, onClose, eventTitle = "Sự kiện" }: RecurrenceModalProps) {
  const [frequency, setFrequency] = useState("weekly");
  const [interval, setInterval] = useState(1);
  const [endType, setEndType] = useState<"never" | "date" | "count">("never");
  const [endDate, setEndDate] = useState("");
  const [endCount, setEndCount] = useState(10);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]);

  if (!isOpen) return null;

  const days = [
    { label: "CN", value: 0 },
    { label: "T2", value: 1 },
    { label: "T3", value: 2 },
    { label: "T4", value: 3 },
    { label: "T5", value: 4 },
    { label: "T6", value: 5 },
    { label: "T7", value: 6 },
  ];

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-surface-container-high">
          <div>
            <h2 className="text-lg font-bold text-on-surface">Cài đặt lặp lại</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">{eventTitle}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-container transition-colors">
            <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Tần suất lặp</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "daily", label: "Hàng ngày" },
                { value: "weekly", label: "Hàng tuần" },
                { value: "monthly", label: "Hàng tháng" },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFrequency(f.value)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    frequency === f.value ? "bg-primary text-white" : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interval */}
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">
              Lặp mỗi {interval} {frequency === "daily" ? "ngày" : frequency === "weekly" ? "tuần" : "tháng"}
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={interval}
              onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Weekly day picker */}
          {frequency === "weekly" && (
            <div>
              <label className="block text-sm font-medium text-on-surface mb-2">Lặp vào các ngày</label>
              <div className="flex gap-1.5">
                {days.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => toggleDay(day.value)}
                    className={`w-10 h-10 rounded-xl text-xs font-medium transition-colors ${
                      selectedDays.includes(day.value) ? "bg-primary text-white" : "bg-surface-container text-on-surface-variant"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* End condition */}
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Kết thúc</label>
            <div className="space-y-2">
              {[
                { value: "never" as const, label: "Không bao giờ" },
                { value: "date" as const, label: "Vào ngày" },
                { value: "count" as const, label: "Sau số lần" },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl cursor-pointer">
                  <input
                    type="radio"
                    name="endType"
                    checked={endType === opt.value}
                    onChange={() => setEndType(opt.value)}
                    className="w-4 h-4 text-primary accent-primary"
                  />
                  <span className="text-sm text-on-surface">{opt.label}</span>
                  {endType === "date" && opt.value === "date" && (
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="ml-auto px-3 py-1.5 border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  )}
                  {endType === "count" && opt.value === "count" && (
                    <input
                      type="number"
                      min={1}
                      value={endCount}
                      onChange={(e) => setEndCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="ml-auto w-20 px-3 py-1.5 border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-center"
                    />
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-surface-container-high">
          <button onClick={onClose} className="flex-1 py-3 border border-outline-variant rounded-xl font-medium text-on-surface hover:bg-surface-container transition-colors">
            Hủy
          </button>
          <button onClick={onClose} className="flex-1 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors">
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}
