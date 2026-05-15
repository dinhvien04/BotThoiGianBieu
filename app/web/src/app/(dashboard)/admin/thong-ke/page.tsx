"use client";

import { useEffect, useMemo, useState } from "react";
import { adminGetStats, type AdminDashboardStats } from "@/lib/api";

export default function AdminStatsPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminGetStats()
      .then((res) => {
        if (!cancelled) setStats(res.stats);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Thống kê hệ thống</h1>
        <p className="text-sm text-gray-500">
          Biểu đồ tăng trưởng và tỷ lệ trạng thái lịch toàn hệ thống.
        </p>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-red-700 text-sm">
          {error}
        </div>
      ) : null}

      {!stats ? (
        <p className="text-sm text-gray-500">Đang tải…</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Series title="User đăng ký 30 ngày" data={stats.signups_last_30_days} />
          <Series title="Lịch tạo 30 ngày" data={stats.schedules_last_30_days} />
          <StatusBreakdown stats={stats} />
        </div>
      )}
    </div>
  );
}

function Series({
  title,
  data,
}: {
  title: string;
  data: Array<{ date: string; count: number }>;
}) {
  const max = useMemo(
    () => data.reduce((acc, d) => (d.count > acc ? d.count : acc), 0) || 1,
    [data],
  );
  const total = useMemo(
    () => data.reduce((acc, d) => acc + d.count, 0),
    [data],
  );
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface p-4">
      <h2 className="text-sm font-semibold mb-1">{title}</h2>
      <p className="text-xs text-gray-500 mb-3">Tổng 30 ngày: {total}</p>
      {data.length === 0 ? (
        <p className="text-xs text-gray-500">Chưa có dữ liệu.</p>
      ) : (
        <div className="flex items-end gap-1 h-40">
          {data.map((d) => (
            <div
              key={d.date}
              className="flex-1 min-w-[3px] bg-primary rounded-sm"
              style={{ height: `${(d.count / max) * 100}%` }}
              title={`${d.date}: ${d.count}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBreakdown({ stats }: { stats: AdminDashboardStats }) {
  const total = stats.total_schedules || 1;
  const pendingPct = Math.round((stats.schedules_pending / total) * 100);
  const completedPct = Math.round((stats.schedules_completed / total) * 100);
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface p-4">
      <h2 className="text-sm font-semibold mb-3">Tỷ lệ trạng thái lịch</h2>
      <div className="space-y-3">
        <Bar label={`Pending (${stats.schedules_pending})`} pct={pendingPct} tone="warn" />
        <Bar
          label={`Hoàn thành (${stats.schedules_completed})`}
          pct={completedPct}
          tone="ok"
        />
      </div>
    </div>
  );
}

function Bar({
  label,
  pct,
  tone,
}: {
  label: string;
  pct: number;
  tone: "warn" | "ok";
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="text-gray-500">{pct}%</span>
      </div>
      <div className="h-2 bg-surface-container rounded-full overflow-hidden">
        <div
          className={`h-full ${tone === "ok" ? "bg-green-500" : "bg-amber-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
