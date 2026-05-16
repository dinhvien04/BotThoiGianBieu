"use client";

import { useState } from "react";

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickAddModal({ isOpen, onClose }: QuickAddModalProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [type, setType] = useState("meeting");

  if (!isOpen) return null;

  const handleSubmit = () => {
    onClose();
    setTitle("");
    setDate("");
    setTime("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-container-high">
          <h2 className="text-lg font-bold text-on-surface">Thêm nhanh lịch</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-container transition-colors">
            <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">Tiêu đề *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề sự kiện..."
              className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">Ngày</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">Giờ</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">Loại sự kiện</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "meeting", label: "Cuộc họp", color: "#6750A4" },
                { value: "work", label: "Công việc", color: "#2196F3" },
                { value: "event", label: "Sự kiện", color: "#27AE60" },
                { value: "personal", label: "Cá nhân", color: "#F2994A" },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    type === t.value ? "text-on-primary" : "bg-surface-container text-on-surface-variant"
                  }`}
                  style={type === t.value ? { backgroundColor: t.color } : undefined}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-surface-container-high">
          <button onClick={onClose} className="flex-1 py-3 border border-outline-variant rounded-xl font-medium text-on-surface hover:bg-surface-container transition-colors">
            Hủy
          </button>
          <button onClick={handleSubmit} className="flex-1 py-3 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary/90 transition-colors">
            Tạo lịch
          </button>
        </div>
      </div>
    </div>
  );
}
