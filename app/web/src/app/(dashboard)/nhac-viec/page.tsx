"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { typeColors, typeLabels } from "@/lib/mock-data";
import { useSchedules } from "@/lib/hooks";
import { ListSkeleton } from "@/components/dashboard/SkeletonLoader";
import { DataLoadError } from "@/components/dashboard/ErrorStates";
import type { Schedule } from "@/lib/api";

function formatReminderOffset(start: string, remind_at: string | null): string {
  if (!remind_at) return "";
  const diffMinutes = Math.round(
    (new Date(start).getTime() - new Date(remind_at).getTime()) / 60000,
  );
  if (diffMinutes <= 0) return "đúng giờ";
  if (diffMinutes >= 1440) return `${Math.floor(diffMinutes / 1440)} ngày trước`;
  if (diffMinutes >= 60) return `${Math.floor(diffMinutes / 60)} giờ trước`;
  return `${diffMinutes} phút trước`;
}

export default function RemindersPage() {
  const [filter, setFilter] = useState<"all" | "today" | "upcoming">("all");
  const { data, loading, error, refetch } = useSchedules({ limit: 50 });

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Chỉ giữ lịch có remind_at được set, sắp theo remind_at gần nhất trước
  const reminders = useMemo(() => {
    const items = (data?.items ?? []).filter((s: Schedule) => Boolean(s.remind_at));
    return items
      .map((s: Schedule) => ({
        ...s,
        reminderTime: formatReminderOffset(s.start_time, s.remind_at),
      }))
      .sort((a, b) =>
        (a.remind_at ?? "").localeCompare(b.remind_at ?? ""),
      );
  }, [data]);

  const filtered = reminders.filter((r) => {
    if (filter === "today") return r.start_time.startsWith(today);
    if (filter === "upcoming") return r.start_time > today;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Nhắc việc</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Quản lý tất cả các nhắc nhở của bạn. Có <span className="font-semibold text-primary">{reminders.length}</span> nhắc nhở đang bật.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 custom-scrollbar">
          {(["all", "today", "upcoming"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === f ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                }`}
            >
              {f === "all" ? "Tất cả" : f === "today" ? "Hôm nay" : "Sắp tới"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-primary/10 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-on-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">{reminders.length}</p>
            <p className="text-sm text-on-surface-variant">Nhắc nhở đang hoạt động</p>
          </div>
        </div>
        <div className="bg-[#27AE60]/10 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-[#27AE60] rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-on-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#27AE60]">
              {reminders.filter((r) => r.start_time.startsWith(today)).length}
            </p>
            <p className="text-sm text-on-surface-variant">Nhắc nhở hôm nay</p>
          </div>
        </div>
      </div>

      {error && !loading && <DataLoadError onRetry={refetch} />}
      {loading && !data && <ListSkeleton rows={5} />}

      <div className="bg-surface-container-lowest rounded-2xl shadow-sm divide-y divide-surface-container-high">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            <p className="text-on-surface-variant">Không có nhắc nhở nào</p>
          </div>
        ) : (
          filtered.map((r) => (
            <Link
              key={r.id}
              href={`/lich/${r.id}`}
              className="flex items-center gap-4 p-4 hover:bg-surface-container-low transition-colors"
            >
              <div
                className="w-1.5 h-12 rounded-full shrink-0"
                style={{ backgroundColor: typeColors[r.item_type] || "#6750A4" }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-on-surface truncate">{r.title}</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  {new Date(r.start_time).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })}
                  {" • "}
                  {new Date(r.start_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span
                  className="inline-block px-2.5 py-1 rounded-lg text-xs font-medium text-on-primary"
                  style={{ backgroundColor: typeColors[r.item_type] || "#6750A4" }}
                >
                  {typeLabels[r.item_type] ?? r.item_type}
                </span>
                <p className="text-xs text-on-surface-variant mt-1.5">
                  <svg className="w-3.5 h-3.5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  {r.reminderTime}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
