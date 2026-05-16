"use client";

import { useState, useEffect, useCallback } from "react";
import { useUserProfile } from "@/lib/hooks";
import { updateUserSettings } from "@/lib/api";

const workDays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];

const settingsTabs = [
  { id: "general", label: "Chung", icon: "⚙️" },
  { id: "notification", label: "Thông báo", icon: "🔔" },
  { id: "integration", label: "Tích hợp", icon: "🔗" },
  { id: "template", label: "Mẫu", icon: "📋" },
];

export default function SettingsPage() {
  const { data: profileData, refetch } = useUserProfile();
  const [activeTab, setActiveTab] = useState("general");
  const [language, setLanguage] = useState("vi");
  const [theme, setTheme] = useState("light");
  const [notifChannel, setNotifChannel] = useState("browser");
  const [notifMode, setNotifMode] = useState("dm");
  const [reminderMinutes, setReminderMinutes] = useState("15");
  const [selectedDays, setSelectedDays] = useState([0, 1, 2, 3, 4]);
  const [workStart, setWorkStart] = useState("08:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profileData?.settings) {
      const s = profileData.settings;
      setReminderMinutes(String(s.default_remind_minutes));
      setNotifMode(s.notify_via_dm ? "dm" : "channel");
      setWorkStart(`${String(s.work_start_hour).padStart(2, "0")}:00`);
      setWorkEnd(`${String(s.work_end_hour).padStart(2, "0")}:00`);
    }
  }, [profileData]);

  const handleSaveSettings = useCallback(async () => {
    setSaving(true);
    try {
      await updateUserSettings({
        default_remind_minutes: parseInt(reminderMinutes, 10) || 15,
        notify_via_dm: notifMode === "dm",
        notify_via_channel: notifMode === "channel",
        work_start_hour: parseInt(workStart, 10) || 8,
        work_end_hour: parseInt(workEnd, 10) || 17,
      });
      refetch();
    } catch {
      // silent fallback
    } finally {
      setSaving(false);
    }
  }, [reminderMinutes, notifMode, workStart, workEnd, refetch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Cài đặt cá nhân</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Quản lý các tùy chọn hệ thống và thông tin cá nhân của bạn.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 border border-outline-variant rounded-xl text-on-surface font-medium text-sm hover:bg-surface-container transition-colors">
            Hủy
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-5 py-2.5 bg-primary text-on-primary rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container rounded-xl p-1">
        {settingsTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant"
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
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
              <h2 className="font-bold text-on-surface">Cài đặt chung</h2>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">Múi giờ</label>
                <select className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm">
                  <option>(GMT+07:00) Bangkok, Hanoi, Jakarta</option>
                  <option>(GMT+08:00) Singapore</option>
                  <option>(GMT+09:00) Tokyo</option>
                </select>
                <p className="text-xs text-on-surface-variant mt-1.5">Thời gian hiển thị trên toàn ứng dụng.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">Ngôn ngữ</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLanguage("vi")}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${language === "vi" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}
                  >
                    Tiếng Việt
                  </button>
                  <button
                    onClick={() => setLanguage("en")}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${language === "en" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}
                  >
                    English
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Work Hours */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="font-bold text-on-surface">Giờ làm việc</h2>
            </div>
            <p className="text-sm text-on-surface-variant mb-4">
              Xác định thời gian bạn sẵn sàng để đồng nghiệp có thể xếp lịch họp phù hợp.
            </p>
            <div className="flex gap-2 mb-5">
              {workDays.map((day, idx) => (
                <button
                  key={day}
                  onClick={() => {
                    setSelectedDays(
                      selectedDays.includes(idx)
                        ? selectedDays.filter((d) => d !== idx)
                        : [...selectedDays, idx]
                    );
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    selectedDays.includes(idx)
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-xs text-on-surface-variant uppercase font-semibold mb-1.5">Bắt đầu</label>
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
              <svg className="w-6 h-6 text-on-surface-variant mt-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
              <div className="flex-1">
                <label className="block text-xs text-on-surface-variant uppercase font-semibold mb-1.5">Kết thúc</label>
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
              <h2 className="font-bold text-on-surface">Thông báo</h2>
            </div>

            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-on-surface">Kênh nhận thông báo mặc định</p>
                    <p className="text-xs text-on-surface-variant">Chọn nơi bạn muốn nhận các nhắc nhở sự kiện</p>
                  </div>
                  <select
                    value={notifChannel}
                    onChange={(e) => setNotifChannel(e.target.value)}
                    className="px-4 py-2 border border-outline-variant rounded-lg text-sm text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="browser">Trình duyệt</option>
                    <option value="email">Email</option>
                    <option value="both">Cả hai</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-on-surface">Nhận qua DM hay Channel</p>
                    <p className="text-xs text-on-surface-variant">Phân loại tin nhắn thông báo trong hệ thống Mezon</p>
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
                    <p className="text-sm font-medium text-on-surface">Nhắc trước mặc định</p>
                    <p className="text-xs text-on-surface-variant">Khoảng thời gian nhắc nhở trước khi bắt đầu</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={reminderMinutes}
                      onChange={(e) => setReminderMinutes(e.target.value)}
                      className="w-16 px-3 py-2 border border-outline-variant rounded-lg text-sm text-on-surface text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <span className="text-sm text-on-surface-variant">phút</span>
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
              <h2 className="font-bold text-on-surface">Giao diện</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTheme("light")}
                className={`p-3 rounded-xl border-2 transition-colors ${theme === "light" ? "border-primary" : "border-outline-variant"}`}
              >
                <div className="w-full h-16 bg-surface-container-lowest rounded-lg border border-surface-container-high mb-2" />
                <div className="flex items-center justify-center gap-1.5">
                  {theme === "light" && <span className="w-2 h-2 rounded-full bg-primary" />}
                  <span className="text-sm font-medium text-on-surface">Sáng</span>
                </div>
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`p-3 rounded-xl border-2 transition-colors ${theme === "dark" ? "border-primary" : "border-outline-variant"}`}
              >
                <div className="w-full h-16 bg-[#1C1B1F] rounded-lg mb-2" />
                <div className="flex items-center justify-center gap-1.5">
                  {theme === "dark" && <span className="w-2 h-2 rounded-full bg-primary" />}
                  <span className="text-sm font-medium text-on-surface">Tối</span>
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
              <h2 className="font-bold text-on-surface">Tích hợp</h2>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-sm">
                M
              </div>
              <div className="flex-1">
                <p className="font-medium text-on-surface">Mezon</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#27AE60]/10 text-[#27AE60] font-medium">
                  Đang kết nối
                </span>
              </div>
            </div>
            <p className="text-xs text-on-surface-variant mb-4">
              Kết nối tài khoản Mezon để đồng bộ danh sách liên lạc và gửi thông báo trực tiếp qua kênh hội thoại.
            </p>
            <button className="w-full py-2.5 border border-outline-variant rounded-xl text-sm font-medium text-on-surface hover:bg-surface-container transition-colors">
              Cấu hình Mezon
            </button>
          </div>

          {/* Productivity Tip */}
          <div className="bg-primary rounded-2xl p-6 text-on-primary">
            <p className="font-semibold">Mẹo năng suất</p>
            <p className="text-sm opacity-80 mt-2">
              Thiết lập giờ làm việc giúp bạn tránh bị làm phiền bởi các cuộc họp ngoài khung giờ cá nhân.
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
            <div key={app.name} className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm flex items-center justify-between">
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
                <span className="px-3 py-1.5 bg-[#27AE60]/10 text-[#27AE60] text-xs font-medium rounded-lg">Đã kết nối</span>
              ) : (
                <button className="px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors">
                  Kết nối
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab: Template */}
      {activeTab === "template" && (
        <div className="max-w-2xl space-y-4">
          <p className="text-sm text-on-surface-variant">Quản lý các mẫu mặc định cho sự kiện mới.</p>
          {[
            { name: "Cuộc họp mặc định", duration: "30 phút", reminder: "15 phút trước", type: "meeting" },
            { name: "Deadline công việc", duration: "1 giờ", reminder: "1 ngày trước", type: "work" },
            { name: "Sự kiện cá nhân", duration: "2 giờ", reminder: "30 phút trước", type: "personal" },
          ].map((tpl) => (
            <div key={tpl.name} className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-on-surface">{tpl.name}</h3>
                <button className="text-sm text-primary font-medium hover:underline">Chỉnh sửa</button>
              </div>
              <div className="flex gap-4 text-sm text-on-surface-variant">
                <span>⏱ {tpl.duration}</span>
                <span>🔔 {tpl.reminder}</span>
              </div>
            </div>
          ))}
          <button className="w-full py-3 border-2 border-dashed border-outline-variant rounded-2xl text-sm font-medium text-on-surface-variant hover:border-primary/40 hover:text-primary transition-colors">
            + Thêm mẫu mới
          </button>
        </div>
      )}
    </div>
  );
}
