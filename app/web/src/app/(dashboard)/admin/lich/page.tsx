"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminDeleteSchedule,
  adminListSchedules,
  type AdminScheduleListItem,
} from "@/lib/api";

const PAGE_SIZE = 20;

export default function AdminSchedulesPage() {
  const [items, setItems] = useState<AdminScheduleListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminListSchedules({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: status || undefined,
        user_id: userId || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, status, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const onDelete = async (it: AdminScheduleListItem) => {
    if (!confirm(`Xoá lịch "${it.title}" (id=${it.id}) của ${it.user_id}?`)) {
      return;
    }
    setBusyId(it.id);
    try {
      await adminDeleteSchedule(it.id);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Quản lý lịch (toàn hệ thống)</h1>
        <p className="text-sm text-gray-500">Tổng: {total} lịch</p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(searchInput.trim());
        }}
        className="flex flex-wrap gap-2 items-end bg-surface p-3 rounded-xl border border-outline-variant"
      >
        <label className="text-sm">
          <span className="block text-xs text-gray-500 mb-1">Tiêu đề</span>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="từ khoá"
            className="border rounded-lg px-3 py-2 text-sm w-64 bg-surface"
          />
        </label>
        <label className="text-sm">
          <span className="block text-xs text-gray-500 mb-1">User ID</span>
          <input
            value={userId}
            onChange={(e) => {
              setPage(1);
              setUserId(e.target.value);
            }}
            placeholder="user_id"
            className="border rounded-lg px-3 py-2 text-sm w-44 bg-surface"
          />
        </label>
        <label className="text-sm">
          <span className="block text-xs text-gray-500 mb-1">Trạng thái</span>
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="border rounded-lg px-3 py-2 text-sm bg-surface"
          >
            <option value="">Tất cả</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <button
          type="submit"
          className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium"
        >
          Lọc
        </button>
      </form>

      {error ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-red-700 text-sm">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-outline-variant bg-surface">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-gray-500 bg-surface-container">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Tiêu đề</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Trạng thái</th>
              <th className="px-3 py-2">Ưu tiên</th>
              <th className="px-3 py-2">Thời gian</th>
              <th className="px-3 py-2 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-t border-outline-variant">
                <td className="px-3 py-2 text-xs text-gray-500">{s.id}</td>
                <td className="px-3 py-2">{s.title}</td>
                <td className="px-3 py-2 text-xs">
                  <div>{s.user_display_name ?? s.user_username ?? s.user_id}</div>
                  <div className="text-gray-500">{s.user_id}</div>
                </td>
                <td className="px-3 py-2 text-xs">{s.status}</td>
                <td className="px-3 py-2 text-xs">{s.priority}</td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  {new Date(s.start_time).toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    disabled={busyId === s.id}
                    onClick={() => onDelete(s)}
                    className="px-2 py-1 rounded-lg border border-red-300 text-red-600 text-xs hover:bg-red-50"
                  >
                    Xoá
                  </button>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                  Không có lịch phù hợp.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">
          Trang {page} / {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-lg border disabled:opacity-50"
          >
            ← Trước
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg border disabled:opacity-50"
          >
            Sau →
          </button>
        </div>
      </div>
    </div>
  );
}
