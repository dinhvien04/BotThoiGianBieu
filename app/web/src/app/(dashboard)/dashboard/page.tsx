"use client";

import { useEffect, useMemo, useState } from "react";
import { useSchedules, useStatistics, useUserProfile, useStreak } from "@/lib/hooks";
import type { Schedule } from "@/lib/api";

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

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

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const startDayOffset = firstDay === 0 ? 6 : firstDay - 1; // Mon = 0, Sun = 6
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const todayDate = now.getDate();
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  const formattedDate = now.toLocaleDateString('vi-VN', dateOptions);
  const monthYearString = `Tháng ${month + 1}, ${year}`;

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

  const displayName = profile?.user?.display_name ?? profile?.user?.username ?? "";
  const greetingPrefix = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return "Khuya rồi";
    if (h < 11) return "Chào buổi sáng";
    if (h < 13) return "Chào buổi trưa";
    if (h < 18) return "Chào buổi chiều";
    if (h < 22) return "Chào buổi tối";
    return "Khuya rồi";
  }, []);
  const greetingText = displayName
    ? `${greetingPrefix}, ${displayName}!`
    : `${greetingPrefix}!`;

  // Donut chart: animate from 0 to real values after mount
  const [donutMounted, setDonutMounted] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setDonutMounted(true), 80);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="dash-enter">
        <h1 className="text-xl sm:text-2xl font-bold text-on-surface break-words">
          {greetingText}
        </h1>
        <p className="text-on-surface-variant text-xs sm:text-sm mt-1">
          Hôm nay bạn có <span className="font-semibold text-on-surface">{todayEvents.length}</span> sự kiện và <span className="font-semibold text-on-surface">{overdueCount}</span> nhiệm vụ cần chú ý.
          {streak && streak.currentStreak > 0 && (
            <span className="ml-2">🔥 Streak: {streak.currentStreak} ngày liên tiếp</span>
          )}
        </p>
      </header>

      {/* Stat Cards: 1 hero (HOM NAY) + 4 small */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Hero stat */}
        <div className="dash-enter dash-stagger-1 card-lift lg:col-span-2 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-md flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold tracking-wider uppercase opacity-80">Hôm nay</p>
            <p className="text-4xl sm:text-5xl font-extrabold mt-1">{String(todayEvents.length).padStart(2, "0")}</p>
            <p className="text-xs sm:text-sm opacity-90 mt-1">sự kiện cần thực hiện</p>
          </div>
          <svg className="w-12 h-12 sm:w-16 sm:h-16 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0121 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </div>
        <StatCard label="Quá hạn" value={String(overdueCount).padStart(2, "0")} sub="nhiệm vụ" color="text-error" icon="warning" stagger={2} />
        <StatCard label="7 ngày tới" value={String(upcomingWeek.length).padStart(2, "0")} sub="sự kiện" color="text-on-surface" stagger={3} />
        <StatCard label="Hoàn thành" value={`${completionRate}%`} sub="tổng số" color="text-on-surface" stagger={4} />
        <StatCard label="Nhắc việc" value={String(activeReminders).padStart(2, "0")} sub="đang bật" color="text-on-surface" stagger={5} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Timeline */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="dash-enter dash-stagger-6 bg-surface-container-lowest rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-bold text-on-surface">Lịch trình hôm nay</h2>
              <span className="text-xs sm:text-sm text-primary font-medium capitalize">{formattedDate}</span>
            </div>
            {todayEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary-fixed flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-on-surface mb-2">Bạn chưa có sự kiện nào hôm nay</h3>
                <p className="text-xs sm:text-sm text-on-surface-variant mb-5 max-w-sm">
                  Hãy tạo lịch đầu tiên để bắt đầu quản lý công việc hiệu quả hơn. Mọi việc sẽ được nhắc nhở tự động qua Mezon.
                </p>
                <a
                  href="/lich/tao-moi"
                  className="btn-press inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Tạo lịch đầu tiên
                </a>
              </div>
            ) : (
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
                              className="px-3 py-2 rounded-lg text-on-primary text-sm"
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
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Mini Calendar */}
          <div className="dash-enter dash-stagger-6 bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-on-surface">{monthYearString}</h3>
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
              {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                <div key={d} className="py-1 text-on-surface-variant font-medium">{d}</div>
              ))}
              {Array.from({ length: startDayOffset }, (_, i) => (
                <div key={`empty-${i}`} className="py-1.5 text-on-surface-variant/50"></div>
              ))}
              {calendarDays.map((day) => (
                <div
                  key={day}
                  className={`py-1.5 rounded-full text-sm cursor-pointer transition-colors ${day === todayDate
                    ? "bg-primary text-on-primary font-bold"
                    : "hover:bg-surface-container-high text-on-surface"
                    }`}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

          {/* Time Distribution */}
          <div className="dash-enter dash-stagger-7 card-lift bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-on-surface mb-4">Phân bổ thời gian</h3>
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#E8DEF8" strokeWidth="4" />
                  <circle
                    cx="18" cy="18" r="14" fill="none" stroke="#6750A4" strokeWidth="4"
                    strokeDasharray={donutMounted ? "52.8 35.2" : "0 88"}
                    style={{ transition: "stroke-dasharray 1.1s cubic-bezier(0.22,1,0.36,1)" }}
                  />
                  <circle
                    cx="18" cy="18" r="14" fill="none" stroke="#F2994A" strokeWidth="4"
                    strokeDasharray={donutMounted ? "0 52.8 22 13.2" : "0 88"}
                    style={{ transition: "stroke-dasharray 1.1s cubic-bezier(0.22,1,0.36,1) 0.15s" }}
                  />
                  <circle
                    cx="18" cy="18" r="14" fill="none" stroke="#27AE60" strokeWidth="4"
                    strokeDasharray={donutMounted ? "0 74.8 13.2 0" : "0 88"}
                    style={{ transition: "stroke-dasharray 1.1s cubic-bezier(0.22,1,0.36,1) 0.3s" }}
                  />
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
          <div className="dash-enter dash-stagger-7 card-lift bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-error font-bold text-lg">!</span>
              <h3 className="font-bold text-on-surface">Ưu tiên cao</h3>
            </div>
            <div className="space-y-3">
              {priorityTasks.map((task: Schedule) => (
                <label key={task.id} className="flex items-start gap-3 cursor-pointer group">
                  <input type="checkbox" className="ux-checkbox mt-1" />
                  <div>
                    <p className="text-sm font-medium text-on-surface transition-colors group-hover:text-primary">{task.title}</p>
                    <p className="text-xs text-on-surface-variant">
                      {task.start_time.startsWith(today) ? "Hôm nay" : `Deadline: ${new Date(task.start_time).toLocaleDateString("vi-VN")}`}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            <button className="btn-press text-primary text-sm font-medium mt-3 hover:underline">
              Xem tất cả nhiệm vụ &rarr;
            </button>
          </div>

          {/* Deadline Soon */}
          <div className="dash-enter dash-stagger-8 card-lift bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
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
  stagger,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  icon?: string;
  stagger?: number;
}) {
  const staggerClass = stagger ? `dash-stagger-${stagger}` : "";
  return (
    <div className={`dash-enter ${staggerClass} card-lift bg-surface-container-lowest rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm`}>
      <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
        {icon === "warning" && (
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-error flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
        )}
        <p className="text-[10px] sm:text-xs text-on-surface-variant font-medium tracking-wider uppercase truncate">{label}</p>
      </div>
      <p className={`text-2xl sm:text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[10px] sm:text-xs text-on-surface-variant mt-0.5 sm:mt-1">{sub}</p>}
    </div>
  );
}
