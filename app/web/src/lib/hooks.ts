"use client";

import useSWR, { type Key, type SWRConfiguration } from "swr";
import * as api from "./api";
import { toApiScheduleItemType, toApiSchedulePriority } from "./mock-data";

/**
 * Common return shape giữ tương thích với code cũ:
 * `{ data, loading, error, refetch }`.
 */
type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

/** Wrap useSWR thành interface FetchState để consumers không cần đổi. */
function useSWRState<T>(
  key: Key,
  fetcher: () => Promise<T>,
  options?: SWRConfiguration<T>,
): FetchState<T> {
  const { data, error, isLoading, mutate } = useSWR<T>(key, fetcher, options);
  return {
    data: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refetch: () => {
      void mutate();
    },
  };
}

/** UI-friendly schedule type matching existing label/color maps */
export interface DisplaySchedule {
  id: number;
  title: string;
  description: string | null;
  start: string;
  end: string;
  type: string;
  status: string;
  priority: string;
  tags: string[];
  location?: string;
  reminder?: number;
  recurrence?: string;
  participants?: string[];
}

/** Convert api.Schedule → DisplaySchedule for UI rendering */
export function apiToDisplay(s: api.Schedule): DisplaySchedule {
  let reminderMinutes: number | undefined;
  if (s.remind_at && s.start_time) {
    const diff = new Date(s.start_time).getTime() - new Date(s.remind_at).getTime();
    if (diff > 0) reminderMinutes = Math.round(diff / 60000);
  }

  return {
    id: s.id,
    title: s.title,
    description: s.description,
    start: s.start_time,
    end: s.end_time || s.start_time,
    type: toApiScheduleItemType(s.item_type),
    status: s.status,
    priority: toApiSchedulePriority(s.priority),
    tags: s.tags?.map((t) => t.name) || [],
    reminder: reminderMinutes,
    recurrence: s.recurrence_type && s.recurrence_type !== "none" ? s.recurrence_type : undefined,
  };
}

// ─────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────

export function useSchedules(
  params?: Parameters<typeof api.getSchedules>[0],
): FetchState<{ items: api.Schedule[]; total: number }> {
  const key = ["schedules", params ?? null] as const;
  return useSWRState<{ items: api.Schedule[]; total: number }>(
    key,
    async () => {
      const res = await api.getSchedules(params);
      if (!res.success) throw new Error("API error");
      return { items: res.items, total: res.total };
    },
    {
      keepPreviousData: true,
      fallbackData: { items: [], total: 0 },
    },
  );
}

export function useScheduleById(id: number): FetchState<api.Schedule> {
  return useSWRState<api.Schedule>(
    id ? ["schedule", id] : null,
    async () => {
      const res = await api.getScheduleById(id);
      if (!res.success) throw new Error(res.error ?? "Not found");
      return res.schedule;
    },
  );
}

export function useTags(): FetchState<api.Tag[]> {
  return useSWRState<api.Tag[]>(
    ["tags"],
    async () => {
      const res = await api.getTags();
      if (!res.success) throw new Error("API error");
      return res.tags;
    },
    { fallbackData: [] },
  );
}

export function useTemplates(): FetchState<api.Template[]> {
  return useSWRState<api.Template[]>(
    ["templates"],
    async () => {
      const res = await api.getTemplates();
      if (!res.success) throw new Error("API error");
      return res.templates;
    },
    { fallbackData: [] },
  );
}

export function useStatistics(start?: string, end?: string): FetchState<api.ScheduleStats> {
  return useSWRState<api.ScheduleStats>(
    ["statistics", start ?? null, end ?? null],
    async () => {
      const res = await api.getScheduleStatistics(start, end);
      if (!res.success) throw new Error("API error");
      return {
        total: res.total,
        byStatus: res.byStatus,
        byItemType: res.byItemType,
        byPriority: res.byPriority,
        topHours: res.topHours,
        recurringActiveCount: res.recurringActiveCount,
      };
    },
  );
}

export function useUserProfile(): FetchState<{
  user: api.UserProfile;
  settings: api.UserSettings;
}> {
  return useSWRState<{ user: api.UserProfile; settings: api.UserSettings }>(
    ["user-profile"],
    async () => {
      const res = await api.getUserProfile();
      if (!res.success) throw new Error("API error");
      return { user: res.user, settings: res.settings };
    },
  );
}

/**
 * Đếm chính xác số lịch quá hạn từ backend (status=overdue).
 * Không phụ thuộc vào limit của useSchedules, không sai do timezone string-compare.
 */
export function useOverdueCount(): FetchState<number> {
  return useSWRState<number>(
    ["overdue-count"],
    async () => {
      const res = await api.getSchedules({ status: "overdue", limit: 1, page: 1 });
      if (!res.success) throw new Error("API error");
      return res.total;
    },
    { fallbackData: 0 },
  );
}

export function useStreak(): FetchState<api.StreakStats> {
  return useSWRState<api.StreakStats>(
    ["streak"],
    async () => {
      const res = await api.getStreak();
      if (!res.success) throw new Error("API error");
      return {
        currentStreak: res.currentStreak,
        longestStreak: res.longestStreak,
        daysActive: res.daysActive,
        totalCompleted: res.totalCompleted,
        lastCompletedDate: res.lastCompletedDate,
      };
    },
  );
}
