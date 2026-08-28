"use client";

import { useState } from "react";
import { mutate } from "swr";
import { createSchedule } from "@/lib/api";
import { useToast } from "./Toast";

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickAddModal({ isOpen, onClose }: QuickAddModalProps) {
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [type, setType] = useState("task");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      showToast("Vui lòng nhập tiêu đề", "warning");
      return;
    }

    const startDate = date || new Date().toISOString().slice(0, 10);
    const startTime = time || "09:00";
    const startIso = new Date(`${startDate}T${startTime}:00`).toISOString();

    setSubmitting(true);
    try {
      const res = await createSchedule({
        title: trimmedTitle,
        item_type: type,
        start_time: startIso,
      });

      if (res.success) {
        showToast("Đã tạo lịch mới", "success");
        await mutate((key) => Array.isArray(key) && (key[0] === "schedules" || key[0] === "statistics" || key[0] === "overdue-count"));
        onClose();
        setTitle("");
        setDate("");
        setTime("");
        setType("task");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Lỗi khi tạo lịch", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-surface-container-lowest rounded-2xl w-full max-w-md shadow-xl">
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
                { value: "task", label: "Công việc", color: "#2196F3" },
                { value: "meeting", label: "Cuộc họp", color: "#6750A4" },
                { value: "event", label: "Sự kiện", color: "#27AE60" },
                { value: "reminder", label: "Nhắc nhở", color: "#F2994A" },
              ].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${type === t.value ? "text-on-primary" : "bg-surface-container text-on-surface-variant"
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
          <button onClick={onClose} disabled={submitting} className="flex-1 py-3 border border-outline-variant rounded-xl font-medium text-on-surface hover:bg-surface-container transition-colors">
            Hủy
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-3 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            {submitting ? "Đang tạo..." : "Tạo lịch"}
          </button>
        </div>
      </div>
    </div>
  );
}
