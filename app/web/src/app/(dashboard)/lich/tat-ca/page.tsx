"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getSchedules,
  bulkCompleteSchedules,
  bulkDeleteSchedules,
  type Schedule,
} from "@/lib/api";
import { ListSkeleton } from "@/components/dashboard/SkeletonLoader";
import { DataLoadError } from "@/components/dashboard/ErrorStates";
import DeleteConfirmDialog from "@/components/dashboard/DeleteConfirmDialog";
import { useToast } from "@/components/dashboard/Toast";

const PAGE_SIZE = 10;

const priorityDot: Record<string, string> = {
  high: "bg-red-500",
  normal: "bg-yellow-500",
  low: "bg-gray-400",
};

const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-primary/10", text: "text-primary", label: "Đang chờ" },
  completed: { bg: "bg-[#27AE60]/10", text: "text-[#27AE60]", label: "Hoàn thành" },
  cancelled: { bg: "bg-surface-container-high", text: "text-on-surface-variant", label: "Đã huỷ" },
  overdue: { bg: "bg-error-container/30", text: "text-on-error-container", label: "Quá hạn" },
};

type SortBy = "newest" | "oldest" | "priority";

const priorityRank: Record<string, number> = { high: 0, normal: 1, low: 2 };

export default function AllSchedulesPage() {
  const { showToast } = useToast();

  // Filters & pagination state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [page, setPage] = useState(1);

  // Data state
  const [items, setItems] = useState<Schedule[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection + bulk dialog
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSchedules({
        page,
        limit: PAGE_SIZE,
        status: statusFilter,
        priority: priorityFilter === "all" ? undefined : priorityFilter,
      });
      setItems(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, priorityFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reset về page 1 khi filter thay đổi
  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [statusFilter, priorityFilter]);

  // Sort client-side trong trang hiện tại
  const sorted = useMemo(() => {
    const arr = [...items];
    if (sortBy === "newest") {
      arr.sort((a, b) => b.start_time.localeCompare(a.start_time));
    } else if (sortBy === "oldest") {
      arr.sort((a, b) => a.start_time.localeCompare(b.start_time));
    } else if (sortBy === "priority") {
      arr.sort(
        (a, b) =>
          (priorityRank[a.priority] ?? 99) - (priorityRank[b.priority] ?? 99),
      );
    }
    return arr;
  }, [items, sortBy]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allSelectedInPage =
    sorted.length > 0 && sorted.every((s) => selected.includes(s.id));

  const toggleAll = () => {
    if (allSelectedInPage) {
      setSelected((prev) => prev.filter((id) => !sorted.some((s) => s.id === id)));
    } else {
      setSelected((prev) => [
        ...prev,
        ...sorted.map((s) => s.id).filter((id) => !prev.includes(id)),
      ]);
    }
  };

  const toggleOne = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleBulkComplete = async () => {
    if (selected.length === 0) return;
    try {
      const res = await bulkCompleteSchedules(selected);
      showToast(`Đã hoàn thành ${res.count} lịch`, "success");
      setSelected([]);
      void load();
    } catch {
      showToast("Không thể hoàn thành. Vui lòng thử lại.", "error");
    }
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    setBulkDeleting(true);
    try {
      const res = await bulkDeleteSchedules(selected);
      showToast(`Đã xoá ${res.count} lịch`, "success");
      setSelected([]);
      setShowBulkDelete(false);
      void load();
    } catch {
      showToast("Không thể xoá. Vui lòng thử lại.", "error");
    } finally {
      setBulkDeleting(false);
    }
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  // Phân trang: hiển thị tối đa 3 trang quanh current + first/last
  const pageNumbers = useMemo(() => {
    const set = new Set<number>();
    set.add(1);
    set.add(totalPages);
    for (let p = page - 1; p <= page + 1; p++) {
      if (p >= 1 && p <= totalPages) set.add(p);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [page, totalPages]);

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
            <option value="cancelled">Đã huỷ</option>
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
            <option value="normal">Bình thường</option>
            <option value="low">Thấp</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-on-surface-variant block mb-1">Sắp xếp</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-3 py-2 border border-outline-variant rounded-lg text-sm text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="priority">Ưu tiên</option>
          </select>
        </div>
      </div>

      {error && <DataLoadError onRetry={load} />}
      {loading && !error && <ListSkeleton rows={PAGE_SIZE} />}

      {!loading && !error && (
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant/50">
                  <th className="pl-5 pr-2 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allSelectedInPage}
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
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-on-surface-variant text-sm">
                      Không có lịch nào khớp bộ lọc.
                    </td>
                  </tr>
                )}
                {sorted.map((schedule) => {
                  const isSelected = selected.includes(schedule.id);
                  const status = statusBadge[schedule.status] ?? statusBadge.pending;
                  const start = new Date(schedule.start_time);
                  return (
                    <tr
                      key={schedule.id}
                      className={`border-b border-outline-variant/30 last:border-0 hover:bg-surface-container-low transition-colors ${isSelected ? "bg-primary/5" : ""}`}
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
                        <div
                          className={`w-3 h-3 rounded-full ${priorityDot[schedule.priority] ?? "bg-gray-400"}`}
                          title={schedule.priority}
                        />
                      </td>
                      <td className="px-3 py-3.5">
                        <Link
                          href={`/lich/${schedule.id}`}
                          className="text-sm font-medium text-on-surface hover:text-primary"
                        >
                          {schedule.title}
                        </Link>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="text-sm text-on-surface">
                          {start.toLocaleDateString("vi-VN")}
                        </div>
                        <div className="text-xs text-on-surface-variant">
                          {start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {(schedule.tags ?? []).slice(0, 3).map((tag) => (
                            <span
                              key={tag.id}
                              className="px-2 py-0.5 bg-surface-container-high rounded text-xs text-on-surface-variant tracking-wide font-medium"
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 pr-5">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/lich/${schedule.id}/sua`}
                            aria-label="Sửa"
                            className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant hover:text-primary"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                          </Link>
                          <Link
                            href={`/lich/${schedule.id}`}
                            aria-label="Xem chi tiết"
                            className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant hover:text-primary"
                          >
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

          {/* Bulk Actions Bar */}
          {selected.length > 0 && (
            <div className="border-t border-outline-variant/50 px-5 py-3 bg-primary/5 flex items-center gap-4">
              <span className="text-sm font-medium text-on-surface">Đã chọn {selected.length}</span>
              <button
                onClick={handleBulkComplete}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Hoàn thành tất cả
              </button>
              <button
                onClick={() => setShowBulkDelete(true)}
                className="text-sm text-error hover:underline flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Xoá
              </button>
              <button
                onClick={() => setSelected([])}
                className="ml-auto text-sm text-on-surface-variant hover:text-on-surface"
              >
                Bỏ chọn
              </button>
            </div>
          )}

          {/* Pagination */}
          <div className="border-t border-outline-variant/50 px-5 py-3 flex items-center justify-between flex-wrap gap-3">
            <span className="text-sm text-on-surface-variant">
              Hiển thị {rangeStart}-{rangeEnd} / {total} lịch trình
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Trang trước"
                className="w-8 h-8 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              {pageNumbers.map((p, idx) => {
                const prev = pageNumbers[idx - 1];
                const showEllipsis = prev !== undefined && p - prev > 1;
                return (
                  <span key={p} className="flex items-center gap-1">
                    {showEllipsis && <span className="text-on-surface-variant mx-1">…</span>}
                    <button
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors flex items-center justify-center ${
                        p === page
                          ? "bg-primary text-on-primary"
                          : "text-on-surface-variant hover:bg-surface-container"
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                );
              })}
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Trang sau"
                className="w-8 h-8 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        isOpen={showBulkDelete}
        title={`Xoá ${selected.length} lịch đã chọn?`}
        description="Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan sẽ bị xoá vĩnh viễn."
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDelete(false)}
      />

      {bulkDeleting && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="bg-surface-container-lowest rounded-2xl px-6 py-4 text-sm text-on-surface shadow-lg">
            Đang xoá...
          </div>
        </div>
      )}
    </div>
  );
}
