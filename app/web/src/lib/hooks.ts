"use client";

import { useCallback, useEffect, useState } from "react";
import * as api from "./api";

type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

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
  const priorityReverse: Record<string, string> = {
    high: "cao",
    normal: "trung-binh",
    low: "thap",
  };
  const statusReverse: Record<string, string> = {
    pending: "dang-cho",
    in_progress: "dang-thuc-hien",
    completed: "hoan-thanh",
    overdue: "qua-han",
  };

  // If the key already exists in Vietnamese (from real API), keep as-is; otherwise reverse-map
  const status = statusReverse[s.status] || s.status;
  const priority = priorityReverse[s.priority] || s.priority;

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
    type: s.item_type || "ca-nhan",
    status,
    priority,
    tags: s.tags?.map((t) => t.name) || [],
    reminder: reminderMinutes,
    recurrence: s.recurrence_type && s.recurrence_type !== "none" ? s.recurrence_type : undefined,
  };
}

export function useSchedules(params?: Parameters<typeof api.getSchedules>[0]): FetchState<{
  items: api.Schedule[];
  total: number;
}> {
  const [data, setData] = useState<{ items: api.Schedule[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getSchedules(params);
      if (result.success) {
        setData({ items: result.items, total: result.total });
        setError(null);
      } else {
        throw new Error("API error");
      }
    } catch (err) {
      console.error("useSchedules error:", err);
      setData({ items: [], total: 0 });
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  useEffect(() => { void fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useScheduleById(id: number): FetchState<api.Schedule> {
  const [data, setData] = useState<api.Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getScheduleById(id);
      if (result.success) {
        setData(result.schedule);
        setError(null);
      } else {
        throw new Error(result.error ?? "Not found");
      }
    } catch (err) {
      console.error("useScheduleById error:", err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useTags(): FetchState<api.Tag[]> {
  const [data, setData] = useState<api.Tag[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getTags();
      if (result.success) {
        setData(result.tags);
        setError(null);
      } else {
        throw new Error("API error");
      }
    } catch (err) {
      console.error("useTags error:", err);
      setData([]);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useTemplates(): FetchState<api.Template[]> {
  const [data, setData] = useState<api.Template[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getTemplates();
      if (result.success) {
        setData(result.templates);
        setError(null);
      } else {
        throw new Error("API error");
      }
    } catch (err) {
      console.error("useTemplates error:", err);
      setData([]);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useStatistics(start?: string, end?: string): FetchState<api.ScheduleStats> {
  const [data, setData] = useState<api.ScheduleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getScheduleStatistics(start, end);
      if (result.success) {
        setData({
          total: result.total,
          byStatus: result.byStatus,
          byItemType: result.byItemType,
          byPriority: result.byPriority,
          topHours: result.topHours,
          recurringActiveCount: result.recurringActiveCount,
        });
        setError(null);
      } else {
        throw new Error("API error");
      }
    } catch (err) {
      console.error("useStatistics error:", err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useEffect(() => { void fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useUserProfile(): FetchState<{
  user: api.UserProfile;
  settings: api.UserSettings;
}> {
  const [data, setData] = useState<{
    user: api.UserProfile;
    settings: api.UserSettings;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getUserProfile();
      if (result.success) {
        setData({ user: result.user, settings: result.settings });
        setError(null);
      } else {
        throw new Error("API error");
      }
    } catch (err) {
      console.error("useUserProfile error:", err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useStreak(): FetchState<api.StreakStats> {
  const [data, setData] = useState<api.StreakStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getStreak();
      if (result.success) {
        setData({
          currentStreak: result.currentStreak,
          longestStreak: result.longestStreak,
          daysActive: result.daysActive,
          totalCompleted: result.totalCompleted,
          lastCompletedDate: result.lastCompletedDate,
        });
        setError(null);
      } else {
        throw new Error("API error");
      }
    } catch (err) {
      console.error("useStreak error:", err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
