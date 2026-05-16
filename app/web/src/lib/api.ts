const BASE = "";

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) ?? {}),
    },
    ...options,
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/dang-nhap";
    }
    throw new Error("Unauthorized");
  }

  const data = (await res.json()) as T;
  return data;
}

export interface Schedule {
  id: number;
  user_id: string;
  item_type: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  status: string;
  priority: string;
  remind_at: string | null;
  recurrence_type: string;
  recurrence_interval: number;
  recurrence_until: string | null;
  is_pinned: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
}

export interface Tag {
  id: number;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface Template {
  id: number;
  user_id: string;
  name: string;
  item_type: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  default_remind_minutes: number | null;
  priority: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  user_id: string;
  username: string | null;
  display_name: string | null;
  role?: "user" | "admin";
  is_locked?: boolean;
}

export interface UserSettings {
  user_id: string;
  timezone: string;
  default_remind_minutes: number;
  notify_via_dm: boolean;
  notify_via_channel: boolean;
  work_start_hour: number;
  work_end_hour: number;
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  daysActive: number;
  totalCompleted: number;
  lastCompletedDate: string | null;
}

export interface ScheduleStats {
  total: number;
  byStatus: Record<string, number>;
  byItemType: Record<string, number>;
  byPriority: Record<string, number>;
  topHours: Array<{ hour: number; count: number }>;
  recurringActiveCount: number;
}

export interface AuditLogEntry {
  id: number;
  schedule_id: number;
  user_id: string;
  action: string;
  changes: Record<string, { from?: unknown; to?: unknown }> | null;
  created_at: string;
}

// --- Schedules ---

export async function getSchedules(params?: {
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
  search?: string;
  start?: string;
  end?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.priority) qs.set("priority", params.priority);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.search) qs.set("search", params.search);
  if (params?.start) qs.set("start", params.start);
  if (params?.end) qs.set("end", params.end);
  const query = qs.toString();
  return request<{
    success: boolean;
    items: Schedule[];
    total: number;
    page?: number;
    limit?: number;
  }>(`/api/schedules${query ? `?${query}` : ""}`);
}

export async function getScheduleById(id: number) {
  return request<{ success: boolean; schedule: Schedule; error?: string }>(
    `/api/schedules/${id}`,
  );
}

export async function createSchedule(data: {
  title: string;
  description?: string;
  item_type?: string;
  start_time: string;
  end_time?: string;
  priority?: string;
  remind_at?: string;
  recurrence_type?: string;
  recurrence_interval?: number;
  recurrence_until?: string;
}) {
  return request<{ success: boolean; schedule: Schedule }>(
    "/api/schedules",
    { method: "POST", body: JSON.stringify(data) },
  );
}

export async function updateSchedule(
  id: number,
  data: Partial<{
    title: string;
    description: string | null;
    item_type: string;
    start_time: string;
    end_time: string | null;
    priority: string;
    status: string;
    remind_at: string | null;
    recurrence_type: string;
    recurrence_interval: number;
    recurrence_until: string | null;
  }>,
) {
  return request<{ success: boolean; schedule: Schedule }>(
    `/api/schedules/${id}`,
    { method: "PATCH", body: JSON.stringify(data) },
  );
}

export async function completeSchedule(id: number) {
  return request<{ success: boolean }>(
    `/api/schedules/${id}/complete`,
    { method: "PATCH" },
  );
}

export async function deleteSchedule(id: number) {
  return request<{ success: boolean }>(
    `/api/schedules/${id}`,
    { method: "DELETE" },
  );
}

export async function getUpcomingSchedules(limit = 5, priority?: string) {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (priority) qs.set("priority", priority);
  return request<{ success: boolean; items: Schedule[] }>(
    `/api/schedules/upcoming?${qs}`,
  );
}

export async function getScheduleStatistics(start?: string, end?: string) {
  const qs = new URLSearchParams();
  if (start) qs.set("start", start);
  if (end) qs.set("end", end);
  const query = qs.toString();
  return request<{ success: boolean } & ScheduleStats>(
    `/api/schedules/statistics${query ? `?${query}` : ""}`,
  );
}

export async function bulkCompleteSchedules(ids: number[]) {
  return request<{ success: boolean; count: number }>(
    "/api/schedules/bulk/complete",
    { method: "POST", body: JSON.stringify({ ids }) },
  );
}

export async function bulkDeleteSchedules(ids: number[]) {
  return request<{ success: boolean; count: number }>(
    "/api/schedules/bulk/delete",
    { method: "POST", body: JSON.stringify({ ids }) },
  );
}

export async function getStreak() {
  return request<{ success: boolean } & StreakStats>(
    "/api/schedules/streak/current",
  );
}

// --- Tags ---

export async function getTags() {
  return request<{ success: boolean; tags: Tag[] }>("/api/tags");
}

export async function createTag(name: string) {
  return request<{ success: boolean; tag: Tag; created: boolean; error?: string }>(
    "/api/tags",
    { method: "POST", body: JSON.stringify({ name }) },
  );
}

export async function deleteTag(name: string) {
  return request<{ success: boolean }>(`/api/tags/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export async function attachTags(scheduleId: number, tags: string[]) {
  return request<{ success: boolean; tags: Tag[]; invalid: string[] }>(
    `/api/tags/${scheduleId}/attach`,
    { method: "POST", body: JSON.stringify({ tags }) },
  );
}

export async function detachTag(scheduleId: number, tag: string) {
  return request<{ success: boolean; removed: boolean }>(
    `/api/tags/${scheduleId}/detach`,
    { method: "POST", body: JSON.stringify({ tag }) },
  );
}

// --- Templates ---

export async function getTemplates() {
  return request<{ success: boolean; templates: Template[] }>("/api/templates");
}

export async function createTemplate(data: {
  name: string;
  title: string;
  description?: string;
  item_type?: string;
  duration_minutes?: number;
  default_remind_minutes?: number;
  priority?: string;
}) {
  return request<{ success: boolean; template: Template; error?: string }>(
    "/api/templates",
    { method: "POST", body: JSON.stringify(data) },
  );
}

export async function deleteTemplate(name: string) {
  return request<{ success: boolean }>(
    `/api/templates/${encodeURIComponent(name)}`,
    { method: "DELETE" },
  );
}

// --- User ---

export async function logout() {
  return request<{ success: boolean }>("/auth/logout", { method: "POST" });
}

export async function getUserProfile() {
  return request<{
    success: boolean;
    user: UserProfile;
    settings: UserSettings;
  }>("/api/user/profile");
}

export async function updateUserSettings(data: Partial<UserSettings>) {
  return request<{ success: boolean; settings: UserSettings }>(
    "/api/user/settings",
    { method: "PATCH", body: JSON.stringify(data) },
  );
}

// --- Shares ---

export async function getSharedWithMe() {
  return request<{ success: boolean; schedules: Schedule[] }>(
    "/api/shares/shared-with-me",
  );
}

export async function shareSchedule(scheduleId: number, targetUserId: string) {
  return request<{ success: boolean; added: boolean }>(
    `/api/shares/${scheduleId}/share`,
    { method: "POST", body: JSON.stringify({ target_user_id: targetUserId }) },
  );
}

export async function unshareSchedule(
  scheduleId: number,
  targetUserId: string,
) {
  return request<{ success: boolean; removed: boolean }>(
    `/api/shares/${scheduleId}/unshare/${encodeURIComponent(targetUserId)}`,
    { method: "DELETE" },
  );
}

// --- Audit ---

export async function getAuditLog(
  scheduleId: number,
  page = 1,
  limit = 10,
) {
  return request<{
    success: boolean;
    items: AuditLogEntry[];
    total: number;
    page: number;
    limit: number;
  }>(`/api/audit/${scheduleId}?page=${page}&limit=${limit}`);
}

// --- Admin ---

export interface AdminDashboardStats {
  total_users: number;
  total_admins: number;
  locked_users: number;
  total_schedules: number;
  schedules_pending: number;
  schedules_completed: number;
  new_users_today: number;
  new_schedules_today: number;
  signups_last_30_days: Array<{ date: string; count: number }>;
  schedules_last_30_days: Array<{ date: string; count: number }>;
}

export interface AdminUserListItem {
  user_id: string;
  username: string | null;
  display_name: string | null;
  role: "user" | "admin";
  is_locked: boolean;
  schedule_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdminScheduleListItem {
  id: number;
  user_id: string;
  user_display_name: string | null;
  user_username: string | null;
  title: string;
  status: string;
  priority: string;
  start_time: string;
  end_time: string | null;
  created_at: string;
}

export interface AdminAuditLogItem {
  id: string;
  schedule_id: number;
  user_id: string;
  user_display_name: string | null;
  action: string;
  changes: Record<string, unknown> | null;
  created_at: string;
}

export interface AdminBroadcastItem {
  id: string;
  sender_user_id: string;
  message: string;
  recipient_filter: Record<string, unknown> | null;
  total_recipients: number;
  success_count: number;
  failed_count: number;
  created_at: string;
}

export interface SystemSettingsMap {
  [key: string]: unknown;
}

export async function adminMe() {
  return request<{
    success: boolean;
    user: { user_id: string; username: string | null; display_name: string | null };
  }>(`/api/admin/me`);
}

export async function adminGetStats() {
  return request<{ success: boolean; stats: AdminDashboardStats }>(
    `/api/admin/stats`,
  );
}

export async function adminListUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  locked?: boolean;
}) {
  const usp = new URLSearchParams();
  if (params?.page) usp.set("page", String(params.page));
  if (params?.limit) usp.set("limit", String(params.limit));
  if (params?.search) usp.set("search", params.search);
  if (params?.role) usp.set("role", params.role);
  if (typeof params?.locked === "boolean")
    usp.set("locked", String(params.locked));
  const q = usp.toString();
  return request<{
    success: boolean;
    items: AdminUserListItem[];
    total: number;
    page: number;
    limit: number;
  }>(`/api/admin/users${q ? `?${q}` : ""}`);
}

export async function adminSetRole(userId: string, role: "user" | "admin") {
  return request<{ success: boolean; user: AdminUserListItem }>(
    `/api/admin/users/${encodeURIComponent(userId)}/role`,
    { method: "PATCH", body: JSON.stringify({ role }) },
  );
}

export async function adminSetLocked(userId: string, locked: boolean) {
  return request<{ success: boolean; user: AdminUserListItem }>(
    `/api/admin/users/${encodeURIComponent(userId)}/lock`,
    { method: "PATCH", body: JSON.stringify({ locked }) },
  );
}

export async function adminDeleteUser(userId: string) {
  return request<{ success: boolean }>(
    `/api/admin/users/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  );
}

export async function adminListSchedules(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  user_id?: string;
}) {
  const usp = new URLSearchParams();
  if (params?.page) usp.set("page", String(params.page));
  if (params?.limit) usp.set("limit", String(params.limit));
  if (params?.search) usp.set("search", params.search);
  if (params?.status) usp.set("status", params.status);
  if (params?.user_id) usp.set("user_id", params.user_id);
  const q = usp.toString();
  return request<{
    success: boolean;
    items: AdminScheduleListItem[];
    total: number;
    page: number;
    limit: number;
  }>(`/api/admin/schedules${q ? `?${q}` : ""}`);
}

export async function adminDeleteSchedule(id: number) {
  return request<{ success: boolean }>(`/api/admin/schedules/${id}`, {
    method: "DELETE",
  });
}

export async function adminListAudit(params?: {
  page?: number;
  limit?: number;
  user_id?: string;
  action?: string;
  schedule_id?: number;
}) {
  const usp = new URLSearchParams();
  if (params?.page) usp.set("page", String(params.page));
  if (params?.limit) usp.set("limit", String(params.limit));
  if (params?.user_id) usp.set("user_id", params.user_id);
  if (params?.action) usp.set("action", params.action);
  if (params?.schedule_id) usp.set("schedule_id", String(params.schedule_id));
  const q = usp.toString();
  return request<{
    success: boolean;
    items: AdminAuditLogItem[];
    total: number;
    page: number;
    limit: number;
  }>(`/api/admin/audit${q ? `?${q}` : ""}`);
}

export async function adminSendBroadcast(
  message: string,
  filter?: { role?: "user" | "admin"; only_unlocked?: boolean },
) {
  return request<{
    success: boolean;
    result: { total: number; success: number; failed: number; failed_user_ids: string[] };
  }>(`/api/admin/broadcasts`, {
    method: "POST",
    body: JSON.stringify({ message, filter }),
  });
}

export async function adminListBroadcasts(params?: {
  page?: number;
  limit?: number;
}) {
  const usp = new URLSearchParams();
  if (params?.page) usp.set("page", String(params.page));
  if (params?.limit) usp.set("limit", String(params.limit));
  const q = usp.toString();
  return request<{
    success: boolean;
    items: AdminBroadcastItem[];
    total: number;
    page: number;
    limit: number;
  }>(`/api/admin/broadcasts${q ? `?${q}` : ""}`);
}

export async function adminGetSettings() {
  return request<{ success: boolean; settings: SystemSettingsMap }>(
    `/api/admin/settings`,
  );
}

export async function adminSetSetting(key: string, value: unknown) {
  return request<{
    success: boolean;
    setting: { key: string; value: unknown };
  }>(`/api/admin/settings/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: JSON.stringify({ value }),
  });
}
