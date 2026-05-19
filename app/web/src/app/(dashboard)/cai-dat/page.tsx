"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useProfile } from "@/components/dashboard/ProfileContext";
import { updateUserSettings } from "@/lib/api";
import { useToast } from "@/components/dashboard/Toast";
import { useLanguage } from "@/components/dashboard/LanguageContext";

const workDayKeys = [
  "settings.day.mon",
  "settings.day.tue",
  "settings.day.wed",
  "settings.day.thu",
  "settings.day.fri",
  "settings.day.sat",
  "settings.day.sun",
];

type TabIcon = (props: { className?: string }) => React.ReactElement;

const TabIcons: Record<string, TabIcon> = {
  general: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992.008.085.008.17 0 .255-.008.378.137.75.43.991l1.004.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124-.072.044-.146.087-.22.128-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87-.075-.04-.148-.083-.22-.127-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991.008-.084.008-.17 0-.255-.008-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.147-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  notification: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
  integration: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  ),
  template: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  ),
};

const settingsTabs: Array<{ id: string; labelKey: string }> = [
  { id: "general", labelKey: "settings.tab.general" },
  { id: "notification", labelKey: "settings.tab.notification" },
  { id: "integration", labelKey: "settings.tab.integration" },
  { id: "template", labelKey: "settings.tab.template" },
];

export default function SettingsPage() {
  const { showToast } = useToast();
  const { user: profileUser, settings: profileSettings, refetch } = useProfile();
  const { language, t } = useLanguage();
  const profileData = useMemo(
    () =>
      profileUser
        ? { user: profileUser, settings: profileSettings }
        : null,
    [profileUser, profileSettings],
  );
  const [activeTab, setActiveTab] = useState("general");
  const [theme, setTheme] = useState("light");
  const [notifChannel, setNotifChannel] = useState("browser");
  const [notifMode, setNotifMode] = useState("dm");
  const [reminderMinutes, setReminderMinutes] = useState("15");
  const [selectedDays, setSelectedDays] = useState([0, 1, 2, 3, 4]);
  const [workStart, setWorkStart] = useState("08:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
      setNotifChannel(localStorage.getItem("notification_channel") || "browser");
      const savedDays = localStorage.getItem("work_days");
      if (savedDays) setSelectedDays(JSON.parse(savedDays));
    } catch {
      // Local settings are best-effort.
    }
  }, []);

  const resetFromProfile = useCallback(() => {
    if (profileData?.settings) {
      const s = profileData.settings;
      setReminderMinutes(String(s.default_remind_minutes));
      setNotifMode(s.notify_via_dm ? "dm" : "channel");
      setWorkStart(`${String(s.work_start_hour).padStart(2, "0")}:00`);
      setWorkEnd(`${String(s.work_end_hour).padStart(2, "0")}:00`);
    }
  }, [profileData]);

  useEffect(() => {
    resetFromProfile();
  }, [resetFromProfile]);

  const handleSaveSettings = useCallback(async () => {
    setSaving(true);
    try {
      const parsedReminder = Number(reminderMinutes);
      const parsedStart = Number(workStart.split(":")[0]);
      const parsedEnd = Number(workEnd.split(":")[0]);
      await updateUserSettings({
        language,
        default_remind_minutes: Number.isFinite(parsedReminder) ? parsedReminder : 15,
        notify_via_dm: notifMode === "dm",
        notify_via_channel: notifMode === "channel",
        work_start_hour: Number.isFinite(parsedStart) ? parsedStart : 8,
        work_end_hour: Number.isFinite(parsedEnd) ? parsedEnd : 17,
      });
      try {
        localStorage.setItem("language", language);
        localStorage.setItem("theme", theme);
        localStorage.setItem("notification_channel", notifChannel);
        localStorage.setItem("work_days", JSON.stringify(selectedDays));
        document.documentElement.classList.toggle("dark", theme === "dark");
      } catch {
        // Local settings are best-effort.
      }
      showToast(t("common.savedSettings"), "success");
      refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.saveSettingsError"), "error");
    } finally {
      setSaving(false);
    }
  }, [
    reminderMinutes,
    notifMode,
    workStart,
    workEnd,
    language,
    theme,
    notifChannel,
    selectedDays,
    refetch,
    showToast,
    t,
  ]);

  const handleCancel = useCallback(() => {
    resetFromProfile();
    try {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
      setNotifChannel(localStorage.getItem("notification_channel") || "browser");
      const savedDays = localStorage.getItem("work_days");
      setSelectedDays(savedDays ? JSON.parse(savedDays) : [0, 1, 2, 3, 4]);
    } catch {
      setSelectedDays([0, 1, 2, 3, 4]);
    }
    showToast(t("common.restoreSettings"), "info");
  }, [resetFromProfile, showToast, t]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">{t("settings.title")}</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {t("settings.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2.5 border border-outline-variant rounded-xl text-on-surface font-medium text-sm hover:bg-surface-container transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-5 py-2.5 bg-primary text-on-primary rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? t("common.saving") : t("common.saveChanges")}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container rounded-xl p-1">
        {settingsTabs.map((tab) => {
          const Icon = TabIcons[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant"}`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              <span className="hidden sm:inline">{t(tab.labelKey)}</span>
            </button>
          );
        })}
      </div>

      {/* Tab: General + Notification (existing content) */}
      {(activeTab === "general" || activeTab === "notification") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* General */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
                <h2 className="font-bold text-on-surface">{t("settings.general.title")}</h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:gap-5">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">{t("settings.timezone")}</label>
                  <select className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm">
                    <option>(GMT+07:00) Bangkok, Hanoi, Jakarta</option>
                    <option>(GMT+08:00) Singapore</option>
                    <option>(GMT+09:00) Tokyo</option>
                  </select>
                  <p className="text-xs text-on-surface-variant mt-1.5">{t("settings.timezoneHelp")}</p>
                </div>
              </div>
            </div>

            {/* Work Hours */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="font-bold text-on-surface">{t("settings.workHours")}</h2>
              </div>
              <p className="text-sm text-on-surface-variant mb-4">
                {t("settings.workHoursDesc")}
              </p>
              <div className="flex gap-2 mb-5 overflow-x-auto w-full pb-2 custom-scrollbar">
                {workDayKeys.map((dayKey, idx) => (
                  <button
                    key={dayKey}
                    onClick={() => {
                      setSelectedDays(
                        selectedDays.includes(idx)
                          ? selectedDays.filter((d) => d !== idx)
                          : [...selectedDays, idx]
                      );
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${selectedDays.includes(idx)
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                  >
                    {t(dayKey)}
                  </button>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                <div className="flex-1 w-full">
                  <label className="block text-xs text-on-surface-variant uppercase font-semibold mb-1.5">{t("settings.start")}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={workStart}
                      onChange={(e) => setWorkStart(e.target.value)}
                      className="flex-1 px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-lg font-bold"
                    />
                    <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <svg className="hidden sm:block w-6 h-6 text-on-surface-variant mt-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
                <div className="flex-1 w-full">
                  <label className="block text-xs text-on-surface-variant uppercase font-semibold mb-1.5">{t("settings.end")}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={workEnd}
                      onChange={(e) => setWorkEnd(e.target.value)}
                      className="flex-1 px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-lg font-bold"
                    />
                    <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                <h2 className="font-bold text-on-surface">{t("common.notifications")}</h2>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-on-surface">{t("settings.notificationChannel")}</p>
                      <p className="text-xs text-on-surface-variant">{t("settings.notificationChannelDesc")}</p>
                    </div>
                    <select
                      value={notifChannel}
                      onChange={(e) => setNotifChannel(e.target.value)}
                      className="px-4 py-2 border border-outline-variant rounded-lg text-sm text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="browser">{t("settings.browser")}</option>
                      <option value="email">{t("settings.email")}</option>
                      <option value="both">{t("settings.both")}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-on-surface">{t("settings.mezonMode")}</p>
                      <p className="text-xs text-on-surface-variant">{t("settings.mezonModeDesc")}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setNotifMode("dm")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${notifMode === "dm" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}
                      >
                        DM
                      </button>
                      <button
                        onClick={() => setNotifMode("channel")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${notifMode === "channel" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}
                      >
                        Channel
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-on-surface">{t("settings.defaultReminder")}</p>
                      <p className="text-xs text-on-surface-variant">{t("settings.defaultReminderDesc")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={reminderMinutes}
                        onChange={(e) => setReminderMinutes(e.target.value)}
                        className="w-16 px-3 py-2 border border-outline-variant rounded-lg text-sm text-on-surface text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <span className="text-sm text-on-surface-variant">{t("settings.minutes")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Theme */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
                </svg>
                <h2 className="font-bold text-on-surface">{t("settings.theme")}</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setTheme("light")}
                  className={`p-3 rounded-xl border-2 transition-colors ${theme === "light" ? "border-primary" : "border-outline-variant"}`}
                >
                  <div className="w-full h-16 bg-surface-container-lowest rounded-lg border border-surface-container-high mb-2" />
                  <div className="flex items-center justify-center gap-1.5">
                    {theme === "light" && <span className="w-2 h-2 rounded-full bg-primary" />}
                    <span className="text-sm font-medium text-on-surface">{t("settings.light")}</span>
                  </div>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`p-3 rounded-xl border-2 transition-colors ${theme === "dark" ? "border-primary" : "border-outline-variant"}`}
                >
                  <div className="w-full h-16 bg-[#1C1B1F] rounded-lg mb-2" />
                  <div className="flex items-center justify-center gap-1.5">
                    {theme === "dark" && <span className="w-2 h-2 rounded-full bg-primary" />}
                    <span className="text-sm font-medium text-on-surface">{t("settings.dark")}</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Mezon Integration */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                <h2 className="font-bold text-on-surface">{t("settings.integrationTitle")}</h2>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-sm">
                  M
                </div>
                <div className="flex-1">
                  <p className="font-medium text-on-surface">Mezon</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#27AE60]/10 text-[#27AE60] font-medium">
                    {t("settings.connected")}
                  </span>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant mb-4">
                {t("settings.mezonDesc")}
              </p>
              <button
                type="button"
                onClick={() => showToast(t("settings.mezonConfigEnv"), "info")}
                className="w-full py-2.5 border border-outline-variant rounded-xl text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
              >
                {t("settings.configMezon")}
              </button>
            </div>

            {/* Productivity Tip */}
            <div className="bg-primary rounded-2xl p-6 text-on-primary">
              <p className="font-semibold">{t("settings.tipTitle")}</p>
              <p className="text-sm opacity-80 mt-2">
                {t("settings.tipText")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Integration */}
      {activeTab === "integration" && (
        <div className="max-w-2xl space-y-4">
          {[
            { name: "Mezon", desc: "Đồng bộ lịch trình, nhận nhắc nhở qua chat", status: "connected", icon: "M" },
            { name: "Google Calendar", desc: "Đồng bộ hai chiều với Google Calendar", status: "disconnected", icon: "G" },
            { name: "Outlook", desc: "Kết nối với Microsoft Outlook Calendar", status: "disconnected", icon: "O" },
            { name: "Slack", desc: "Nhận thông báo lịch trình qua Slack", status: "disconnected", icon: "S" },
            { name: "Notion", desc: "Đồng bộ tasks từ Notion databases", status: "disconnected", icon: "N" },
          ].map((app) => (
            <div key={app.name} className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-on-primary font-bold ${app.status === "connected" ? "bg-primary" : "bg-on-surface-variant/20"}`}>
                  {app.icon}
                </div>
                <div>
                  <p className="font-medium text-on-surface">{app.name}</p>
                  <p className="text-sm text-on-surface-variant">{app.desc}</p>
                </div>
              </div>
              {app.status === "connected" ? (
                <span className="px-3 py-1.5 bg-[#27AE60]/10 text-[#27AE60] text-xs font-medium rounded-lg">{t("settings.connectedStatus")}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => showToast(`${app.name}${t("settings.integrationUnavailableSuffix")}`, "info")}
                  className="px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
                >
                  {t("settings.connect")}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab: Template */}
      {activeTab === "template" && (
        <div className="max-w-2xl space-y-4">
          <p className="text-sm text-on-surface-variant">{t("settings.templatesDesc")}</p>
          {[
            { name: "Cuộc họp mặc định", duration: "30 phút", reminder: "15 phút trước", type: "meeting" },
            { name: "Deadline công việc", duration: "1 giờ", reminder: "1 ngày trước", type: "work" },
            { name: "Sự kiện cá nhân", duration: "2 giờ", reminder: "30 phút trước", type: "personal" },
          ].map((tpl) => (
            <div key={tpl.name} className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-on-surface">{tpl.name}</h3>
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/mau-lich";
                  }}
                  className="text-sm text-primary font-medium hover:underline"
                >
                  {t("settings.edit")}
                </button>
              </div>
              <div className="flex gap-4 text-sm text-on-surface-variant">
                <span>⏱ {tpl.duration}</span>
                <span>🔔 {tpl.reminder}</span>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              window.location.href = "/mau-lich";
            }}
            className="w-full py-3 border-2 border-dashed border-outline-variant rounded-2xl text-sm font-medium text-on-surface-variant hover:border-primary/40 hover:text-primary transition-colors"
          >
            {t("settings.addTemplate")}
          </button>
        </div>
      )}
    </div>
  );
}
