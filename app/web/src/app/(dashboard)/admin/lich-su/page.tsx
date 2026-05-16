"use client";

import { useCallback, useEffect, useState } from "react";
import { adminListAudit, type AdminAuditLogItem } from "@/lib/api";

const PAGE_SIZE = 30;

export default function AdminAuditPage() {
  const [items, setItems] = useState<AdminAuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState("");
  const [action, setAction] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminListAudit({
        page,
        limit: PAGE_SIZE,
        user_id: userId || undefined,
        action: action || undefined,
        schedule_id: scheduleId ? Number(scheduleId) : undefined,
      });
      if (res.success === false) throw new Error((res as any).error || (res as any).message || "API Error");
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [page, userId, action, scheduleId]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Audit log toàn hệ thống</h1>
        <p className="text-sm text-on-surface-variant">Tổng: {total} bản ghi</p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          load();
        }}
        className="flex flex-wrap gap-2 items-end bg-surface p-3 rounded-xl border border-outline-variant"
      >
        <label className="text-sm">
          <span className="block text-xs text-on-surface-variant mb-1">User ID</span>
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="user_id"
            className="border rounded-lg px-3 py-2 text-sm w-44 bg-surface"
          />
        </label>
        <label className="text-sm">
          <span className="block text-xs text-on-surface-variant mb-1">Action</span>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-surface"
          >
            <option value="">Tất cả</option>
            <option value="create">create</option>
            <option value="update">update</option>
            <option value="complete">complete</option>
            <option value="delete">delete</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs text-on-surface-variant mb-1">Schedule ID</span>
          <input
            value={scheduleId}
            onChange={(e) => setScheduleId(e.target.value)}
            placeholder="id"
            inputMode="numeric"
            className="border rounded-lg px-3 py-2 text-sm w-32 bg-surface"
          />
        </label>
        <button
          type="submit"
          className="px-3 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium"
        >
          Lọc
        </button>
      </form>

      {error ? (
        <div className="rounded-xl border border-error/40 bg-error-container/30 p-3 text-on-error-container text-sm">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-outline-variant bg-surface">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-on-surface-variant bg-surface-container">
            <tr>
              <th className="px-3 py-2">Thời gian</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Schedule</th>
              <th className="px-3 py-2">Diff</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-outline-variant align-top">
                <td className="px-3 py-2 text-xs text-on-surface-variant whitespace-nowrap">
                  {new Date(it.created_at).toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-2 text-xs">
                  <div>{it.user_display_name ?? it.user_id}</div>
                  <div className="text-on-surface-variant">{it.user_id}</div>
                </td>
                <td className="px-3 py-2 text-xs font-mono">{it.action}</td>
                <td className="px-3 py-2 text-xs">#{it.schedule_id}</td>
                <td className="px-3 py-2 text-xs">
                  <pre className="whitespace-pre-wrap break-words max-w-xl">
                    {it.changes ? JSON.stringify(it.changes, null, 2) : "—"}
                  </pre>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-on-surface-variant">
                  Không có bản ghi phù hợp.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-on-surface-variant">
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
