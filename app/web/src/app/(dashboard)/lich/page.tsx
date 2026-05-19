'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  schedulePriorityOptions,
  typeColors,
  typeLabels,
  statusLabels,
  statusColors,
} from '@/lib/mock-data';
import { useSchedules, apiToDisplay } from '@/lib/hooks';
import { ListSkeleton } from '@/components/dashboard/SkeletonLoader';
import { DataLoadError } from '@/components/dashboard/ErrorStates';
import { useLanguage } from '@/components/dashboard/LanguageContext';

type ViewMode = 'thang' | 'tuan' | 'ngay' | 'danh-sach';

const daysOfWeek = ['THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7', 'CHỦ NHẬT'];

const statusOptions = [
  { value: 'pending', label: statusLabels.pending },
  { value: 'completed', label: statusLabels.completed },
  { value: 'cancelled', label: statusLabels.cancelled },
  { value: 'overdue', label: statusLabels.overdue },
];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const prevMonthDays = new Date(year, month, 0).getDate();
  const days: { day: number; current: boolean }[] = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    days.push({ day: prevMonthDays - i, current: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, current: true });
  }
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, current: false });
  }
  return days;
}

type CalendarEvent = {
  id: number;
  title: string;
  start: string;
  end?: string | null;
  type?: string;
  status?: string;
  priority?: string;
};

function getEventsForDay<T extends CalendarEvent>(
  year: number,
  month: number,
  day: number,
  allSchedules: T[],
): T[] {
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return allSchedules.filter((s) => typeof s.start === 'string' && s.start.startsWith(dateStr));
}

export default function CalendarPage() {
  const { language } = useLanguage();
  const isEnglish = language === 'en';
  const [view, setView] = useState<ViewMode>('thang');
  const [year] = useState(new Date().getFullYear());
  const [month] = useState(new Date().getMonth());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showOverdue, setShowOverdue] = useState(false);

  const { data: scheduleData, loading, error, refetch } = useSchedules();
  const schedules = scheduleData ? scheduleData.items.map(apiToDisplay) : [];
  const isInitialLoading = loading && !scheduleData;

  const monthDays = getMonthDays(year, month);
  const monthNames = isEnglish
    ? [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ]
    : [
        'Tháng 1',
        'Tháng 2',
        'Tháng 3',
        'Tháng 4',
        'Tháng 5',
        'Tháng 6',
        'Tháng 7',
        'Tháng 8',
        'Tháng 9',
        'Tháng 10',
        'Tháng 11',
        'Tháng 12',
      ];
  const weekDayLabels = isEnglish
    ? ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
    : daysOfWeek;

  const filteredSchedules = schedules.filter((s) => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (filterPriority !== 'all' && s.priority !== filterPriority) return false;
    if (showOverdue && s.status !== 'overdue') return false;
    return true;
  });

  // Today (real) for highlight in month/week/day views
  const todayObj = new Date();
  const todayY = todayObj.getFullYear();
  const todayM = todayObj.getMonth();
  const todayD = todayObj.getDate();

  const overdueCount = schedules.filter((s) => s.status === 'overdue').length;
  const completedCount = schedules.filter((s) => s.status === 'completed').length;
  const totalCount = schedules.length;
  const weekProgress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  if (isInitialLoading) {
    return <ListSkeleton rows={6} />;
  }

  if (error && !scheduleData) {
    return <DataLoadError onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span>{isEnglish ? 'Calendar' : 'Lịch biểu'}</span>
            <span>&rsaquo;</span>
            <span>
              {monthNames[month]}, {year}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface mt-1">{isEnglish ? 'My calendar' : 'Lịch của tôi'}</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex bg-surface-container rounded-xl p-1 overflow-x-auto w-full sm:w-auto custom-scrollbar">
            {(['thang', 'tuan', 'ngay', 'danh-sach'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  view === v
                    ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {v === 'thang'
                  ? isEnglish ? 'Month' : 'Tháng'
                  : v === 'tuan'
                    ? isEnglish ? 'Week' : 'Tuần'
                    : v === 'ngay'
                      ? isEnglish ? 'Day' : 'Ngày'
                      : isEnglish ? 'List' : 'Danh sách'}
              </button>
            ))}
          </div>
          <Link
            href="/lich/tao-moi"
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="whitespace-nowrap">{isEnglish ? 'Add schedule' : 'Thêm lịch mới'}</span>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-outline-variant rounded-lg text-sm bg-surface-container-lowest text-on-surface"
          >
            <option value="all">{isEnglish ? 'Status' : 'Trạng thái'}</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 border border-outline-variant rounded-lg text-sm bg-surface-container-lowest text-on-surface"
          >
            <option value="all">{isEnglish ? 'Priority' : 'Ưu tiên'}</option>
            {schedulePriorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select className="px-3 py-2 border border-outline-variant rounded-lg text-sm bg-surface-container-lowest text-on-surface">
            <option>{isEnglish ? 'Tags' : 'Thẻ (Tags)'}</option>
          </select>
          <select className="px-3 py-2 border border-outline-variant rounded-lg text-sm bg-surface-container-lowest text-on-surface">
            <option>{isEnglish ? 'Schedule type' : 'Loại lịch'}</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
          {isEnglish ? 'Only show overdue items' : 'Chỉ hiện việc quá hạn'}
          <button
            onClick={() => setShowOverdue(!showOverdue)}
            className={`w-10 h-5 rounded-full transition-colors relative ${showOverdue ? 'bg-primary' : 'bg-surface-container-highest'}`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-surface-container-lowest shadow transition-transform ${showOverdue ? 'translate-x-5' : 'translate-x-0.5'}`}
            />
          </button>
        </label>
      </div>

      {/* Calendar View */}
      {view === 'thang' && (
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-surface-container-high">
            {weekDayLabels.map((d, dayIndex) => (
              <div
                key={d}
                className={`px-4 py-3 text-xs font-semibold text-center tracking-wider ${dayIndex >= 5 ? 'text-error' : 'text-on-surface-variant'}`}
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((d, idx) => {
              const events = d.current
                ? getEventsForDay(year, month, d.day, filteredSchedules)
                : [];
              const isToday = d.current && d.day === todayD && month === todayM && year === todayY;
              return (
                <div
                  key={idx}
                  className={`min-h-[80px] sm:min-h-[100px] p-1 sm:p-2 border-b border-r border-surface-container-high ${!d.current ? 'bg-surface-container-low/50' : ''}`}
                >
                  <span
                    className={`text-sm inline-flex items-center justify-center w-7 h-7 rounded-full ${isToday ? 'bg-primary text-on-primary font-bold' : d.current ? 'text-on-surface' : 'text-on-surface-variant/40'} ${idx % 7 >= 5 && d.current ? 'text-error' : ''}`}
                  >
                    {d.day}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {events.slice(0, 2).map((ev) => (
                      <Link
                        key={ev.id}
                        href={`/lich/${ev.id}`}
                        className="block px-1.5 py-0.5 rounded text-xs text-on-primary truncate hover:opacity-80"
                        style={{ backgroundColor: typeColors[ev.type] || '#6750A4' }}
                      >
                        {ev.title}
                      </Link>
                    ))}
                    {events.length > 2 && (
                      <span className="text-xs text-on-surface-variant">
                        +{events.length - 2} {isEnglish ? 'more' : 'thêm'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'danh-sach' && (
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-surface-container-high">
            {filteredSchedules.map((schedule) => (
              <Link
                key={schedule.id}
                href={`/lich/${schedule.id}`}
                className="flex items-center gap-4 p-4 hover:bg-surface-container-low transition-colors"
              >
                <div
                  className="w-1 h-12 rounded-full"
                  style={{ backgroundColor: typeColors[schedule.type] }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-on-surface truncate">{schedule.title}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {new Date(schedule.start).toLocaleDateString('vi-VN')} &bull;{' '}
                    {new Date(schedule.start).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    -{' '}
                    {new Date(schedule.end).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {schedule.location && <> &bull; {schedule.location}</>}
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: statusColors[schedule.status] + '20',
                    color: statusColors[schedule.status],
                  }}
                >
                  {statusLabels[schedule.status]}
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-surface-container text-on-surface-variant font-medium">
                  {typeLabels[schedule.type]}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {view === 'tuan' && (
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-x-auto custom-scrollbar">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-8 border-b border-surface-container-high">
              <div className="px-2 py-3 text-xs font-semibold text-on-surface-variant" />
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date(year, month, new Date().getDate() - new Date().getDay() + 1 + i);
                const dayNames = isEnglish ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
                const isToday =
                  d.getDate() === new Date().getDate() && d.getMonth() === new Date().getMonth();
                return (
                  <div key={i} className={`px-2 py-3 text-center ${isToday ? 'bg-primary/5' : ''}`}>
                    <p
                      className={`text-xs font-semibold ${i >= 5 ? 'text-error' : 'text-on-surface-variant'}`}
                    >
                      {dayNames[i]}
                    </p>
                    <p
                      className={`text-lg font-bold mt-0.5 ${isToday ? 'text-primary' : 'text-on-surface'}`}
                    >
                      {d.getDate()}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {Array.from({ length: 12 }, (_, i) => i + 7).map((hour) => (
                <div
                  key={hour}
                  className="grid grid-cols-8 border-b border-surface-container-high min-h-[60px]"
                >
                  <div className="px-2 py-1 text-xs text-on-surface-variant text-right pr-3 pt-2">
                    {String(hour).padStart(2, '0')}:00
                  </div>
                  {Array.from({ length: 7 }, (_, dayIdx) => {
                    const d = new Date(
                      year,
                      month,
                      new Date().getDate() - new Date().getDay() + 1 + dayIdx,
                    );
                    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const events = filteredSchedules.filter((s) => {
                      if (!s.start || !s.start.startsWith(dateStr)) return false;
                      const h = new Date(s.start).getHours();
                      return h === hour;
                    });
                    const isToday =
                      d.getDate() === new Date().getDate() &&
                      d.getMonth() === new Date().getMonth();
                    return (
                      <div
                        key={dayIdx}
                        className={`border-l border-surface-container-high p-0.5 ${isToday ? 'bg-primary/5' : ''}`}
                      >
                        {events.map((ev) => (
                          <Link
                            key={ev.id}
                            href={`/lich/${ev.id}`}
                            className="block px-1.5 py-1 rounded text-xs text-on-primary truncate mb-0.5 hover:opacity-80"
                            style={{ backgroundColor: typeColors[ev.type] || '#6750A4' }}
                          >
                            {ev.title}
                          </Link>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === 'ngay' &&
        (() => {
          const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
          const dayEvents = filteredSchedules.filter(
            (s) => s.start && s.start.startsWith(todayStr),
          );
          const dateOptions: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          };
          const dateDisplay = new Date().toLocaleDateString(isEnglish ? 'en-US' : 'vi-VN', dateOptions);
          return (
            <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <button className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 19.5L8.25 12l7.5-7.5"
                      />
                    </svg>
                  </button>
                  <h2 className="text-lg font-bold text-on-surface capitalize">{dateDisplay}</h2>
                  <button className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 4.5l7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  </button>
                </div>
                <span className="text-sm text-primary font-medium">{dayEvents.length} {isEnglish ? 'events' : 'sự kiện'}</span>
              </div>
              <div className="space-y-0">
                {Array.from({ length: 14 }, (_, i) => i + 6).map((hour) => {
                  const event = dayEvents.find((e) => new Date(e.start).getHours() === hour);
                  const timeStr = `${String(hour).padStart(2, '0')}:00`;
                  return (
                    <div key={hour} className="flex gap-4 border-t border-surface-container-high">
                      <span className="text-xs text-on-surface-variant w-14 pt-3 text-right shrink-0">
                        {timeStr}
                      </span>
                      <div className="flex-1 py-2 min-h-[50px]">
                        {event && (
                          <Link
                            href={`/lich/${event.id}`}
                            className="block px-3 py-2 rounded-lg text-on-primary text-sm hover:opacity-90"
                            style={{ backgroundColor: typeColors[event.type] || '#6750A4' }}
                          >
                            <p className="font-medium">{event.title}</p>
                            <p className="text-xs opacity-80 mt-0.5">
                              {new Date(event.start).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              -{' '}
                              {new Date(event.end).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {event.location && <> &bull; {event.location}</>}
                            </p>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

      {/* Bottom Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-primary rounded-2xl p-6 text-on-primary">
          <h3 className="text-lg font-bold">{isEnglish ? `You have ${overdueCount} overdue tasks!` : `Bạn có ${overdueCount} việc quá hạn!`}</h3>
          <p className="text-sm opacity-80 mt-1">
            {isEnglish
              ? 'Prioritize these tasks to keep your weekly work on track.'
              : 'Hãy ưu tiên giải quyết các tác vụ này để duy trì tiến độ công việc trong tuần.'}
          </p>
          <button className="mt-4 px-4 py-2 bg-surface-container-lowest text-primary rounded-lg text-sm font-medium hover:opacity-90">
            {isEnglish ? 'View details' : 'Xem chi tiết'}
          </button>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-on-surface">{isEnglish ? "This week's progress" : 'Tiến độ tuần này'}</h3>
            <span className="text-2xl font-bold text-primary">{weekProgress}%</span>
          </div>
          <div className="w-full bg-surface-container-high rounded-full h-2.5 mb-4">
            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${weekProgress}%` }} />
          </div>
          <div className="flex flex-col sm:flex-row justify-between text-sm gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#27AE60]" />
              <span className="text-on-surface-variant">{isEnglish ? 'Completed' : 'Đã hoàn thành'}</span>
              <span className="font-medium text-on-surface">{completedCount} {isEnglish ? 'tasks' : 'công việc'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F2994A]" />
              <span className="text-on-surface-variant">{isEnglish ? 'In progress' : 'Đang thực hiện'}</span>
              <span className="font-medium text-on-surface">
                {totalCount - completedCount} {isEnglish ? 'tasks' : 'công việc'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
