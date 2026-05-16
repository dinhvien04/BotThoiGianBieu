"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminListBroadcasts,
  adminSendBroadcast,
  type AdminBroadcastItem,
} from "@/lib/api";

export default function AdminBroadcastPage() {
  const [message, setMessage] = useState("");
  const [role, setRole] = useState("");
  const [onlyUnlocked, setOnlyUnlocked] = useState(true);
  const [sending, setSending] = useState(false);
  const [items, setItems] = useState<AdminBroadcastItem[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await adminListBroadcasts({ page: 1, limit: 20 });
      if (res.success === false) throw new Error((res as any).error || (res as any).message || "API Error");
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!message.trim()) {
      setError("Nội dung không được rỗng.");
      return;
    }
    if (!confirm("Gửi broadcast cho người dùng?")) return;
    setSending(true);
    try {
      const res = await adminSendBroadcast(message.trim(), {
        role: role === "" ? undefined : (role as "user" | "admin"),
        only_unlocked: onlyUnlocked,
      });
      setInfo(
        `Đã gửi cho ${res.result.total} user. Thành công: ${res.result.success}, lỗi: ${res.result.failed}.`,
      );
      setMessage("");
      await loadHistory();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Broadcast</h1>
        <p className="text-sm text-on-surface-variant">
          Soạn nội dung và gửi DM Mezon cho người dùng phù hợp với filter.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="space-y-3 bg-surface p-4 rounded-2xl border border-outline-variant"
      >
        <label className="block text-sm">
          <span className="block text-xs text-on-surface-variant mb-1">Nội dung</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            placeholder="Hệ thống sẽ bảo trì lúc 22h tối nay…"
            className="w-full border rounded-lg px-3 py-2 text-sm bg-surface"
          />
        </label>

        <div className="flex flex-wrap gap-4 items-end">
          <label className="text-sm">
            <span className="block text-xs text-on-surface-variant mb-1">Lọc role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm bg-surface"
            >
              <option value="">Tất cả</option>
              <option value="user">User thường</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={onlyUnlocked}
              onChange={(e) => setOnlyUnlocked(e.target.checked)}
            />
            Bỏ qua user đã bị khoá
          </label>
        </div>

        {error ? (
          <div className="rounded-xl border border-error/40 bg-error-container/30 p-3 text-on-error-container text-sm">
            {error}
          </div>
        ) : null}
        {info ? (
          <div className="rounded-xl border border-green-300 bg-green-50 p-3 text-green-700 text-sm">
            {info}
          </div>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={sending}
            className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium disabled:opacity-50"
          >
            {sending ? "Đang gửi…" : "Gửi broadcast"}
          </button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="font-semibold">Lịch sử broadcast ({total})</h2>
        <div className="overflow-x-auto rounded-2xl border border-outline-variant bg-surface">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-on-surface-variant bg-surface-container">
              <tr>
                <th className="px-3 py-2">Thời gian</th>
                <th className="px-3 py-2">Người gửi</th>
                <th className="px-3 py-2">Nội dung</th>
                <th className="px-3 py-2 text-right">Tổng</th>
                <th className="px-3 py-2 text-right">OK</th>
                <th className="px-3 py-2 text-right">Lỗi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id} className="border-t border-outline-variant align-top">
                  <td className="px-3 py-2 text-xs text-on-surface-variant whitespace-nowrap">
                    {new Date(b.created_at).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2 text-xs">{b.sender_user_id}</td>
                  <td className="px-3 py-2 text-xs">
                    <div className="max-w-md whitespace-pre-wrap break-words">
                      {b.message}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">{b.total_recipients}</td>
                  <td className="px-3 py-2 text-right text-green-700">
                    {b.success_count}
                  </td>
                  <td className="px-3 py-2 text-right text-error">
                    {b.failed_count}
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-on-surface-variant">
                    Chưa có broadcast nào.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
