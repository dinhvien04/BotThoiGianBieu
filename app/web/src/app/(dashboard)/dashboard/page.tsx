"use client";

import { useMemo } from "react";
import { useSchedules, useStatistics, useUserProfile, useStreak } from "@/lib/hooks";
import type { Schedule } from "@/lib/api";

const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);
const october2024StartDay = 1;

const typeColors: Record<string, string> = {
  task: "#6750A4",
  meeting: "#F2994A",
  event: "#27AE60",
  reminder: "#2F80ED",
};

export default function DashboardPage() {
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const weekEnd = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  }, []);

  const { data: profile } = useUserProfile();
  const { data: scheduleData } = useSchedules({ limit: 50 });
  const { data: stats } = useStatistics();
  const { data: streak } = useStreak();

  const allItems = useMemo(() => scheduleData?.items ?? [], [scheduleData]);

  const todayEvents = useMemo(
    () => allItems.filter((s: Schedule) => s.start_time.startsWith(today)),
    [allItems, today],
  );

  const overdueCount = stats?.byStatus?.pending ?? 0;
  const upcomingWeek = useMemo(
    () => allItems.filter((s: Schedule) => s.start_time >= today && s.start_time <= weekEnd),
    [allItems, today, weekEnd],
  );
  const completionRate = stats
    ? stats.total > 0
      ? Math.round(((stats.byStatus.completed ?? 0) / stats.total) * 100)
      : 0
    : 0;
  const activeReminders = useMemo(
    () => allItems.filter((s: Schedule) => s.remind_at && s.status === "pending").length,
    [allItems],
  );

  const priorityTasks = useMemo(
    () => allItems.filter((s: Schedule) => s.priority === "high" && s.status === "pending").slice(0, 4),
    [allItems],
  );

  const deadlineSoon = useMemo(
    () =>
      allItems
        .filter((s: Schedule) => s.status === "pending" && s.start_time >= today)
        .sort((a: Schedule, b: Schedule) => a.start_time.localeCompare(b.start_time))
        .slice(0, 3),
    [allItems, today],
  );

  const displayName = profile?.user?.display_name ?? profile?.user?.username ?? "Bạn";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Chào buổi sáng, {displayName}!</h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Hôm nay bạn có {todayEvents.length} sự kiện và {overdueCount} nhiệm vụ quan trọng cần chú ý.
          {streak && streak.currentStreak > 0 && (
            <span className="ml-2">🔥 Streak: {streak.currentStreak} ngày liên tiếp</span>
          )}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="HÔM NAY" value={String(todayEvents.length).padStart(2, "0")} sub="sự kiện" color="text-primary" />
        <StatCard label="QUÁ HẠN" value={String(overdueCount).padStart(2, "0")} sub="nhiệm vụ" color="text-error" icon="warning" />
        <StatCard label="7 NGÀY TỚI" value={String(upcomingWeek.length).padStart(2, "0")} sub="sự kiện" color="text-primary" />
        <StatCard label="TỶ LỆ HOÀN THÀNH" value={`${completionRate}%`} sub="" color="text-primary" />
        <StatCard label="NHẮC VIỆC" value={String(activeReminders).padStart(2, "0")} sub="đang bật" color="text-primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-on-surface">Lịch trình hôm nay</h2>
              <span className="text-sm text-primary font-medium">Thứ Năm, 24 Tháng 10</span>
            </div>
            <div className="space-y-0">
              {["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"].map(
                (time) => {
                  const event = todayEvents.find((e: Schedule) => {
                    const h = new Date(e.start_time).getHours();
                    return h === parseInt(time);
                  });
                  return (
                    <div key={time} className="flex gap-4 py-3 border-t border-surface-container-high">
                      <span className="text-xs text-on-surface-variant w-12 pt-1 shrink-0">{time}</span>
                      <div className="flex-1 min-h-[40px]">
                        {event && (
                          <div
                            className="px-3 py-2 rounded-lg text-white text-sm"
                            style={{ backgroundColor: typeColors[event.item_type] || "#6750A4" }}
                          >
                            <p className="font-medium">{event.title}</p>
                            <p className="text-xs opacity-80">
                              {event.description || "Online"} &bull; {time} - {event.end_time ? `${new Date(event.end_time).getHours()}:${String(new Date(event.end_time).getMinutes()).padStart(2, "0")}` : ""}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Mini Calendar */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-on-surface">Tháng 10, 2024</h3>
              <div className="flex gap-1">
                <button className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                </button>
                <button className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((d) => (
                <div key={d} className="py-1 text-on-surface-variant font-medium">{d}</div>
              ))}
              {Array.from({ length: october2024StartDay }, (_, i) => (
                <div key={`empty-${i}`} className="py-1.5 text-gray-300">
                  {30 - october2024StartDay + i + 1}
                </div>
              ))}
              {calendarDays.map((day) => (
                <div
                  key={day}
                  className={`py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                    day === 24
                      ? "bg-primary text-white font-bold"
                      : "hover:bg-surface-container-high text-on-surface"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

          {/* Time Distribution */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-on-surface mb-4">Phân bổ thời gian</h3>
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#E8DEF8" strokeWidth="4" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#6750A4" strokeWidth="4" strokeDasharray="52.8 35.2" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#F2994A" strokeWidth="4" strokeDasharray="0 52.8 22 13.2" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#27AE60" strokeWidth="4" strokeDasharray="0 74.8 13.2 0" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-on-surface">8.5h</span>
                  <span className="text-xs text-on-surface-variant">TỔNG CỘNG</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-primary" /> Công việc</div>
                <span className="font-medium">60%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#F2994A]" /> Cá nhân</div>
                <span className="font-medium">25%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#27AE60]" /> Giải trí</div>
                <span className="font-medium">15%</span>
              </div>
            </div>
          </div>

          {/* Priority Tasks */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-error font-bold text-lg">!</span>
              <h3 className="font-bold text-on-surface">Ưu tiên cao</h3>
            </div>
            <div className="space-y-3">
              {priorityTasks.map((task: Schedule) => (
                <label key={task.id} className="flex items-start gap-3 cursor-pointer group">
                  <input type="checkbox" className="mt-1 w-4 h-4 rounded border-outline accent-primary" />
                  <div>
                    <p className="text-sm font-medium text-on-surface group-hover:text-primary">{task.title}</p>
                    <p className="text-xs text-on-surface-variant">
                      {task.start_time.startsWith(today) ? "Hôm nay" : `Deadline: ${new Date(task.start_time).toLocaleDateString("vi-VN")}`}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            <button className="text-primary text-sm font-medium mt-3 hover:underline">
              Xem tất cả nhiệm vụ &rarr;
            </button>
          </div>

          {/* Deadline Soon */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-bold text-on-surface">Sắp đến hạn</h3>
            </div>
            <div className="space-y-3">
              {deadlineSoon.map((item: Schedule) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-on-surface">{item.title}</p>
                    <p className="text-xs text-on-surface-variant">
                      Còn {Math.max(1, Math.ceil((new Date(item.start_time).getTime() - new Date().getTime()) / 86400000))} ngày
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary-fixed text-primary font-medium">
                    {item.tags?.[0]?.name || item.item_type || "Công việc"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  icon?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        {icon === "warning" && (
          <svg className="w-4 h-4 text-error" fill="currentColor" viewBox="0 0 24 24">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
        )}
        <p className="text-xs text-on-surface-variant font-medium tracking-wider uppercase">{label}</p>
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-on-surface-variant mt-1">{sub}</p>}
    </div>
  );
}
