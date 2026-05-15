"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminDeleteUser,
  adminListUsers,
  adminSetLocked,
  adminSetRole,
  type AdminUserListItem,
} from "@/lib/api";

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [role, setRole] = useState("");
  const [locked, setLocked] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminListUsers({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        role: role || undefined,
        locked: locked === "" ? undefined : locked === "true",
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, role, locked]);

  useEffect(() => {
    load();
  }, [load]);

  const onRoleToggle = async (u: AdminUserListItem) => {
    const next = u.role === "admin" ? "user" : "admin";
    if (
      next === "user" &&
      !confirm(`Hạ quyền ${u.user_id} từ admin về user?`)
    ) {
      return;
    }
    setBusyId(u.user_id);
    try {
      await adminSetRole(u.user_id, next);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const onLockToggle = async (u: AdminUserListItem) => {
    const next = !u.is_locked;
    if (next && !confirm(`Khoá tài khoản ${u.user_id}?`)) return;
    setBusyId(u.user_id);
    try {
      await adminSetLocked(u.user_id, next);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (u: AdminUserListItem) => {
    if (
      !confirm(
        `Xoá tài khoản ${u.user_id}? Tất cả lịch / audit / settings của user sẽ bị xoá vĩnh viễn.`,
      )
    ) {
      return;
    }
    setBusyId(u.user_id);
    try {
      await adminDeleteUser(u.user_id);
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
        <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
        <p className="text-sm text-gray-500">
          Tổng: {total} user. Tìm theo user_id / username / display name.
        </p>
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
          <span className="block text-xs text-gray-500 mb-1">Tìm kiếm</span>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="user_id, username, tên"
            className="border rounded-lg px-3 py-2 text-sm w-64 bg-surface"
          />
        </label>
        <label className="text-sm">
          <span className="block text-xs text-gray-500 mb-1">Role</span>
          <select
            value={role}
            onChange={(e) => {
              setPage(1);
              setRole(e.target.value);
            }}
            className="border rounded-lg px-3 py-2 text-sm bg-surface"
          >
            <option value="">Tất cả</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs text-gray-500 mb-1">Khoá</span>
          <select
            value={locked}
            onChange={(e) => {
              setPage(1);
              setLocked(e.target.value);
            }}
            className="border rounded-lg px-3 py-2 text-sm bg-surface"
          >
            <option value="">Tất cả</option>
            <option value="false">Active</option>
            <option value="true">Locked</option>
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
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Trạng thái</th>
              <th className="px-3 py-2 text-right">Lịch</th>
              <th className="px-3 py-2">Tạo lúc</th>
              <th className="px-3 py-2 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.user_id} className="border-t border-outline-variant">
                <td className="px-3 py-2">
                  <div className="font-medium">
                    {u.display_name ?? u.username ?? u.user_id}
                  </div>
                  <div className="text-xs text-gray-500">
                    {u.user_id}
                    {u.username ? ` · @${u.username}` : ""}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.role === "admin"
                        ? "bg-primary text-white"
                        : "bg-surface-container-low"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {u.is_locked ? (
                    <span className="text-amber-700 text-xs">🔒 Locked</span>
                  ) : (
                    <span className="text-green-700 text-xs">✅ Active</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">{u.schedule_count}</td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  {new Date(u.created_at).toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                  <button
                    type="button"
                    disabled={busyId === u.user_id}
                    onClick={() => onRoleToggle(u)}
                    className="px-2 py-1 rounded-lg border text-xs hover:bg-surface-container-low"
                  >
                    {u.role === "admin" ? "Hạ user" : "Lên admin"}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === u.user_id}
                    onClick={() => onLockToggle(u)}
                    className="px-2 py-1 rounded-lg border text-xs hover:bg-surface-container-low"
                  >
                    {u.is_locked ? "Mở khoá" : "Khoá"}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === u.user_id}
                    onClick={() => onDelete(u)}
                    className="px-2 py-1 rounded-lg border border-red-300 text-red-600 text-xs hover:bg-red-50"
                  >
                    Xoá
                  </button>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                  Không có user phù hợp.
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
