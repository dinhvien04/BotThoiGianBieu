"use client";

import { useState } from "react";
import Link from "next/link";

const mockSchedules = [
  { id: 1, title: "Họp chiến lược Quý 2", date: "15/04/2024", time: "08:00", priority: "high", status: "pending", tags: ["Công việc", "Quan trọng"] },
  { id: 2, title: "Duyệt thiết kế UI/UX", date: "16/04/2024", time: "14:30", priority: "medium", status: "pending", tags: ["Thiết kế"] },
  { id: 3, title: "Phỏng vấn Senior Dev", date: "17/04/2024", time: "10:00", priority: "high", status: "overdue", tags: ["Nhân sự"] },
  { id: 4, title: "Ăn trưa với đối tác", date: "17/04/2024", time: "12:00", priority: "low", status: "completed", tags: ["Cá nhân"] },
  { id: 5, title: "Kiểm tra Email hệ thống", date: "18/04/2024", time: "08:30", priority: "medium", status: "pending", tags: ["Công việc"] },
  { id: 6, title: "Fix bug production", date: "18/04/2024", time: "13:00", priority: "high", status: "pending", tags: ["Khẩn cấp"] },
  { id: 7, title: "Học Tiếng Anh", date: "18/04/2024", time: "19:00", priority: "low", status: "pending", tags: ["Học tập"] },
  { id: 8, title: "Backup dữ liệu", date: "18/04/2024", time: "00:00", priority: "medium", status: "pending", tags: ["Hệ thống"] },
  { id: 9, title: "Gặp bác sĩ", date: "19/04/2024", time: "15:30", priority: "high", status: "pending", tags: ["Sức khỏe"] },
  { id: 10, title: "Mua sắm cuối tuần", date: "20/04/2024", time: "10:00", priority: "low", status: "pending", tags: ["Cá nhân"] },
];

const priorityDot: Record<string, string> = { high: "bg-red-500", medium: "bg-yellow-500", low: "bg-gray-400" };
const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-primary/10", text: "text-primary", label: "Đang chờ" },
  completed: { bg: "bg-green-50", text: "text-green-700", label: "Hoàn thành" },
  overdue: { bg: "bg-error-container/30", text: "text-on-error-container", label: "Quá hạn" },
};

export default function AllSchedulesPage() {
  const [selected, setSelected] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const allSelected = selected.length === mockSchedules.length;

  const toggleAll = () => {
    setSelected(allSelected ? [] : mockSchedules.map((s) => s.id));
  };

  const toggleOne = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const filtered = mockSchedules.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (priorityFilter !== "all" && s.priority !== priorityFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Tất cả lịch trình</h1>
        <Link
          href="/lich/tao-moi"
          className="px-5 py-2.5 bg-primary text-on-primary rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Tạo lịch trình mới
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <label className="text-xs text-on-surface-variant block mb-1">Trạng thái</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-outline-variant rounded-lg text-sm text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">Tất cả</option>
            <option value="pending">Đang chờ</option>
            <option value="completed">Hoàn thành</option>
            <option value="overdue">Quá hạn</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-on-surface-variant block mb-1">Mức ưu tiên</label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-outline-variant rounded-lg text-sm text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">Tất cả</option>
            <option value="high">Cao</option>
            <option value="medium">Vừa</option>
            <option value="low">Thấp</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-on-surface-variant block mb-1">Sắp xếp</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-outline-variant rounded-lg text-sm text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="priority">Ưu tiên</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/50">
                <th className="pl-5 pr-2 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/30"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Ưu tiên</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Tên sự kiện</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Thời gian</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Trạng thái</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Thẻ</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-on-surface-variant uppercase tracking-wider pr-5">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((schedule) => {
                const isSelected = selected.includes(schedule.id);
                const status = statusBadge[schedule.status] ?? statusBadge.pending;
                return (
                  <tr
                    key={schedule.id}
                    className={`border-b border-outline-variant/30 last:border-0 hover:bg-surface-container-lowest transition-colors ${isSelected ? "bg-primary/5" : ""}`}
                  >
                    <td className="pl-5 pr-2 py-3.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(schedule.id)}
                        className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/30"
                      />
                    </td>
                    <td className="px-3 py-3.5">
                      <div className={`w-3 h-3 rounded-full ${priorityDot[schedule.priority]}`} />
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="text-sm font-medium text-on-surface">{schedule.title}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="text-sm text-on-surface">{schedule.date}</div>
                      <div className="text-xs text-on-surface-variant">{schedule.time}</div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {schedule.tags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-surface-container-high rounded text-xs text-on-surface-variant uppercase tracking-wide font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 pr-5">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/lich/${schedule.id}/sua`} className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant hover:text-primary">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </Link>
                        <button className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant hover:text-error">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                        <Link href={`/lich/${schedule.id}`} className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant hover:text-primary">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Batch Actions Bar */}
        {selected.length > 0 && (
          <div className="border-t border-outline-variant/50 px-5 py-3 bg-surface-container-lowest flex items-center gap-4">
            <span className="text-sm font-medium text-on-surface">Đã chọn {selected.length}</span>
            <button className="text-sm text-primary hover:underline flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Hoàn thành tất cả
            </button>
            <button className="text-sm text-error hover:underline flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              Xóa
            </button>
          </div>
        )}

        {/* Pagination */}
        <div className="border-t border-outline-variant/50 px-5 py-3 flex items-center justify-between">
          <span className="text-sm text-on-surface-variant">
            Hiển thị 1-{filtered.length} / 78 lịch trình
          </span>
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            {[1, 2, 3].map((page) => (
              <button
                key={page}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors flex items-center justify-center ${
                  page === 1 ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {page}
              </button>
            ))}
            <span className="text-on-surface-variant mx-1">...</span>
            <button className="w-8 h-8 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors flex items-center justify-center">
              8
            </button>
            <button className="w-8 h-8 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
