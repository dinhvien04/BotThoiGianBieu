"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminGetStats, type AdminDashboardStats } from "@/lib/api";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminGetStats()
      .then((res) => {
        if (!cancelled) {
          if (res.success === false) throw new Error((res as any).error || (res as any).message || "API Error");
          setStats(res.stats);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Bảng điều khiển quản trị</h1>
          <p className="text-sm text-on-surface-variant">
            Tổng quan KPI và xu hướng 30 ngày gần nhất
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/nguoi-dung"
            className="btn-press px-3 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium"
          >
            Quản lý user
          </Link>
          <Link
            href="/admin/thong-bao"
            className="btn-press px-3 py-2 rounded-lg bg-secondary-container text-on-secondary-container text-sm font-medium"
          >
            Broadcast
          </Link>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-error/40 bg-error-container text-on-error-container p-4 text-sm">
          {error}
        </div>
      ) : null}

      {loading || !stats ? (
        <div className="text-sm text-on-surface-variant">Đang tải số liệu…</div>
      ) : (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Tổng user" value={stats.total_users} hint={`${stats.total_admins} admin`} />
            <KpiCard label="User mới hôm nay" value={stats.new_users_today} />
            <KpiCard
              label="Đang khoá"
              value={stats.locked_users}
              tone={stats.locked_users > 0 ? "warn" : undefined}
            />
            <KpiCard
              label="Tổng lịch"
              value={stats.total_schedules}
              hint={`pending: ${stats.schedules_pending} • done: ${stats.schedules_completed}`}
            />
            <KpiCard label="Lịch mới hôm nay" value={stats.new_schedules_today} />
            <KpiCard label="Pending" value={stats.schedules_pending} />
            <KpiCard label="Hoàn thành" value={stats.schedules_completed} />
            <KpiCard
              label="Tỷ lệ hoàn thành"
              value={
                stats.total_schedules > 0
                  ? `${Math.round(
                    (stats.schedules_completed / stats.total_schedules) *
                    100,
                  )}%`
                  : "—"
              }
            />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BarChart
              title="User đăng ký 30 ngày"
              data={stats.signups_last_30_days}
            />
            <BarChart
              title="Lịch tạo 30 ngày"
              data={stats.schedules_last_30_days}
            />
          </section>
        </>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "warn";
}) {
  return (
    <div
      className={`card-lift rounded-2xl p-4 border ${tone === "warn"
          ? "border-tertiary/40 bg-tertiary-container text-on-tertiary-container"
          : "border-outline-variant bg-surface-container-lowest"
        }`}
    >
      <p className="text-xs text-on-surface-variant uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {hint ? <p className="text-xs text-on-surface-variant mt-1">{hint}</p> : null}
    </div>
  );
}

function BarChart({
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
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface p-4">
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      {data.length === 0 ? (
        <p className="text-xs text-on-surface-variant">Chưa có dữ liệu.</p>
      ) : (
        <div className="flex items-end gap-1 h-32">
          {data.map((d) => (
            <div
              key={d.date}
              className="flex-1 min-w-[3px] bg-primary rounded-sm relative group"
              style={{ height: `${(d.count / max) * 100}%` }}
              title={`${d.date}: ${d.count}`}
            >
              <span className="sr-only">{`${d.date}: ${d.count}`}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-between text-[10px] text-on-surface-variant mt-2">
        <span>{data[0]?.date ?? ""}</span>
        <span>{data[data.length - 1]?.date ?? ""}</span>
      </div>
    </div>
  );
}
