"use client";

import { useCallback, useEffect, useState } from "react";
import * as api from "./api";
import { mockSchedules, mockTags, mockTemplates } from "./mock-data";

type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

function mapMockToApiSchedule(m: (typeof mockSchedules)[number]): api.Schedule {
  const priorityMap: Record<string, string> = {
    cao: "high",
    "trung-binh": "normal",
    thap: "low",
  };
  const statusMap: Record<string, string> = {
    "dang-cho": "pending",
    "dang-thuc-hien": "pending",
    "hoan-thanh": "completed",
    "qua-han": "pending",
  };
  return {
    id: m.id,
    user_id: "mock",
    item_type: "task",
    title: m.title,
    description: m.description,
    start_time: m.start,
    end_time: m.end,
    status: statusMap[m.status] ?? "pending",
    priority: priorityMap[m.priority] ?? "normal",
    remind_at: null,
    recurrence_type: m.recurrence ?? "none",
    recurrence_interval: 1,
    recurrence_until: null,
    is_pinned: false,
    is_hidden: false,
    created_at: m.start,
    updated_at: m.start,
    tags: m.tags.map((t, i) => ({
      id: i,
      user_id: "mock",
      name: t,
      color: null,
      created_at: "",
    })),
  };
}

function mapMockToApiTag(m: (typeof mockTags)[number]): api.Tag {
  return {
    id: m.id,
    user_id: "mock",
    name: m.name,
    color: m.color,
    created_at: "",
  };
}

function mapMockToApiTemplate(
  m: (typeof mockTemplates)[number],
): api.Template {
  const priorityMap: Record<string, string> = {
    cao: "high",
    "trung-binh": "normal",
    thap: "low",
  };
  return {
    id: m.id,
    user_id: "mock",
    name: m.title.toLowerCase().replace(/\s+/g, "-"),
    item_type: "task",
    title: m.title,
    description: m.description,
    duration_minutes: m.duration,
    default_remind_minutes: m.reminder ?? null,
    priority: priorityMap[m.priority] ?? "normal",
    created_at: "",
    updated_at: "",
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
    } catch {
      const items = mockSchedules.map(mapMockToApiSchedule);
      setData({ items, total: items.length });
      setError(null);
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
    } catch {
      const mock = mockSchedules.find((s) => s.id === id);
      if (mock) {
        setData(mapMockToApiSchedule(mock));
      } else {
        setError("Schedule not found");
      }
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
    } catch {
      setData(mockTags.map(mapMockToApiTag));
      setError(null);
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
    } catch {
      setData(mockTemplates.map(mapMockToApiTemplate));
      setError(null);
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
    } catch {
      setData({
        total: mockSchedules.length,
        byStatus: { pending: 10, completed: 5, cancelled: 0 },
        byItemType: { task: 8, meeting: 4, event: 2, reminder: 1 },
        byPriority: { high: 5, normal: 7, low: 3 },
        topHours: [
          { hour: 9, count: 5 },
          { hour: 14, count: 3 },
          { hour: 10, count: 2 },
        ],
        recurringActiveCount: 2,
      });
      setError(null);
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
    } catch {
      setData({
        user: {
          user_id: "mock-user",
          username: "demo_user",
          display_name: "Người dùng Demo",
        },
        settings: {
          user_id: "mock-user",
          timezone: "Asia/Ho_Chi_Minh",
          default_remind_minutes: 30,
          notify_via_dm: false,
          notify_via_channel: true,
          work_start_hour: 8,
          work_end_hour: 17,
        },
      });
      setError(null);
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
    } catch {
      setData({
        currentStreak: 5,
        longestStreak: 14,
        daysActive: 28,
        totalCompleted: 45,
        lastCompletedDate: new Date().toISOString().split("T")[0],
      });
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
