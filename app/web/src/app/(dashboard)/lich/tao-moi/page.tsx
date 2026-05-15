"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { typeLabels, priorityLabels } from "@/lib/mock-data";
import { createSchedule } from "@/lib/api";
import { useToast } from "@/components/dashboard/Toast";

export default function CreateSchedulePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "ca-nhan",
    title: "",
    description: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    priority: "trung-binh",
    reminder: "15",
    recurrence: "",
    tags: [] as string[],
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-1">
            <Link href="/lich" className="hover:text-primary">Lịch biểu</Link>
            <span>&rsaquo;</span>
            <span>Thêm lịch mới</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Thêm lịch mới</h1>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-8">
        {/* Thông tin cơ bản */}
        <div className="flex items-center gap-2 text-primary mb-6">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <h2 className="text-lg font-semibold">Thông tin cơ bản</h2>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Loại lịch</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {Object.entries(typeLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Tiêu đề sự kiện</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Tên cuộc họp, hoạt động..."
              className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Mô tả chi tiết</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ghi chú thêm về sự kiện này..."
              rows={4}
              className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>

        {/* Thời gian */}
        <div className="flex items-center gap-2 text-primary mt-8 mb-6">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-lg font-semibold">Thời gian</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Ngày bắt đầu</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Giờ bắt đầu</label>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
              className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Ngày kết thúc</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Giờ kết thúc</label>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
              className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Preview Card */}
        {form.title && (
          <div className="mt-6 p-4 bg-surface-container-low rounded-xl border border-outline-variant">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-white bg-primary px-2 py-0.5 rounded">XEM TRƯỚC</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center w-12">
                <div className="text-xs text-primary font-bold uppercase">
                  T {form.startDate ? new Date(form.startDate).getMonth() + 1 : new Date().getMonth() + 1}
                </div>
                <div className="text-2xl font-bold text-on-surface">
                  {form.startDate ? String(new Date(form.startDate).getDate()).padStart(2, "0") : String(new Date().getDate()).padStart(2, "0")}
                </div>
              </div>
              <div>
                <p className="font-semibold text-on-surface">{form.title}</p>
                <p className="text-xs text-on-surface-variant">
                  {form.startTime || "--:--"} - {form.endTime || "--:--"}
                </p>
                {form.recurrence && (
                  <p className="text-xs text-primary mt-0.5">
                    Lặp lại {form.recurrence === "daily" ? "hàng ngày" : form.recurrence === "weekly" ? "hàng tuần" : "hàng tháng"}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tùy chọn nâng cao */}
        <div className="flex items-center gap-2 text-primary mt-8 mb-6">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
          <h2 className="text-lg font-semibold">Tùy chọn nâng cao</h2>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-3">Mức độ ưu tiên</label>
            <div className="flex gap-2">
              {Object.entries(priorityLabels).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setForm({ ...form, priority: k })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${form.priority === k
                    ? "bg-primary text-white"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Thời gian nhắc nhở</label>
            <select
              value={form.reminder}
              onChange={(e) => setForm({ ...form, reminder: e.target.value })}
              className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="5">5 phút trước khi bắt đầu</option>
              <option value="10">10 phút trước khi bắt đầu</option>
              <option value="15">15 phút trước khi bắt đầu</option>
              <option value="30">30 phút trước khi bắt đầu</option>
              <option value="60">1 giờ trước khi bắt đầu</option>
              <option value="1440">1 ngày trước</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Lặp lại</label>
            <select
              value={form.recurrence}
              onChange={(e) => setForm({ ...form, recurrence: e.target.value })}
              className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Không lặp lại</option>
              <option value="daily">Hàng ngày</option>
              <option value="weekly">Hàng tuần</option>
              <option value="monthly">Hàng tháng</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {["Công việc", "Cá nhân", "Quan trọng", "Học tập"].map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    const tags = form.tags.includes(tag)
                      ? form.tags.filter((t) => t !== tag)
                      : [...form.tags, tag];
                    setForm({ ...form, tags });
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${form.tags.includes(tag)
                    ? "bg-primary text-white"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                >
                  #{tag}
                </button>
              ))}
              <button className="px-3 py-1.5 rounded-full text-sm font-medium text-primary border border-primary/30 hover:bg-primary/5">
                + Thêm
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-surface-container-high">
          <Link
            href="/lich"
            className="px-6 py-3 border border-outline-variant rounded-xl text-on-surface font-medium hover:bg-surface-container transition-colors"
          >
            Hủy bỏ
          </Link>
          <button
            disabled={saving || !form.title || !form.startDate || !form.startTime}
            onClick={async () => {
              setSaving(true);
              try {
                const startIso = `${form.startDate}T${form.startTime}:00`;
                const endIso = form.endDate && form.endTime ? `${form.endDate}T${form.endTime}:00` : undefined;
                const reminderMinutes = Number(form.reminder) || 15;
                const remindAt = new Date(new Date(startIso).getTime() - reminderMinutes * 60000).toISOString();
                await createSchedule({
                  title: form.title,
                  description: form.description || undefined,
                  item_type: form.type,
                  start_time: new Date(startIso).toISOString(),
                  end_time: endIso ? new Date(endIso).toISOString() : undefined,
                  priority: form.priority,
                  remind_at: remindAt,
                  recurrence_type: form.recurrence || undefined,
                });
                showToast("Tạo lịch thành công!", "success");
                router.refresh();
                router.push("/lich");
              } catch {
                showToast("Không thể tạo lịch. Vui lòng thử lại.", "error");
              } finally {
                setSaving(false);
              }
            }}
            className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Đang lưu..." : "Lưu sự kiện"}
          </button>
        </div>
      </div>
    </div>
  );
}
