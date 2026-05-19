"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { typeColors, typeLabels } from "@/lib/mock-data";
import { getSchedules, getSharedWithMe, shareSchedule, type Schedule } from "@/lib/api";
import { ListSkeleton } from "@/components/dashboard/SkeletonLoader";
import { DataLoadError } from "@/components/dashboard/ErrorStates";
import { useToast } from "@/components/dashboard/Toast";
import { useLanguage } from "@/components/dashboard/LanguageContext";

export default function SharePage() {
  const { showToast } = useToast();
  const { language } = useLanguage();
  const isEnglish = language === "en";
  const [tab, setTab] = useState<"shared" | "contacts">("shared");
  const [sharedSchedules, setSharedSchedules] = useState<Schedule[]>([]);
  const [ownSchedules, setOwnSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareScheduleId, setShareScheduleId] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [sharing, setSharing] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sharedRes, ownRes] = await Promise.all([
        getSharedWithMe(),
        getSchedules({ status: "all", limit: 50 }),
      ]);
      setSharedSchedules(sharedRes.schedules ?? []);
      setOwnSchedules(ownRes.items ?? []);
      setShareScheduleId((ownRes.items?.[0]?.id ?? "").toString());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleShare = async () => {
    const scheduleId = Number(shareScheduleId);
    const trimmedTarget = targetUserId.trim();
    if (!scheduleId || !trimmedTarget) {
      showToast(isEnglish ? "Choose a schedule and enter the Mezon user ID to share with." : "Chọn lịch và nhập Mezon user ID cần chia sẻ.", "warning");
      return;
    }
    setSharing(true);
    try {
      const res = await shareSchedule(scheduleId, trimmedTarget);
      if (!res.success) throw new Error(isEnglish ? "Could not share schedule." : "Không chia sẻ được lịch.");
      showToast(res.added ? (isEnglish ? "Schedule shared." : "Đã chia sẻ lịch.") : (isEnglish ? "This user has already been shared with." : "Người dùng này đã được chia sẻ trước đó."), "success");
      setShareOpen(false);
      setTargetUserId("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : (isEnglish ? "Could not share schedule." : "Không thể chia sẻ lịch."), "error");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">{isEnglish ? "Share" : "Chia sẻ"}</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {isEnglish ? "Manage shared schedules and teammate contacts." : "Quản lý lịch chia sẻ và danh bạ đồng nghiệp."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="px-5 py-2.5 bg-primary text-on-primary rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
          {isEnglish ? "Share new schedule" : "Chia sẻ lịch mới"}
        </button>
      </div>

      <div className="flex gap-1 bg-surface-container rounded-xl p-1">
        <button
          onClick={() => setTab("shared")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === "shared" ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant"}`}
        >
          {isEnglish ? `Schedules shared with me (${sharedSchedules.length})` : `Lịch được chia sẻ với tôi (${sharedSchedules.length})`}
        </button>
        <button
          onClick={() => setTab("contacts")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === "contacts" ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant"}`}
        >
          {isEnglish ? "Contacts" : "Danh bạ"}
        </button>
      </div>

      {tab === "shared" && (
        <>
          {error && <DataLoadError onRetry={load} />}
          {loading && <ListSkeleton rows={4} />}
          {!loading && !error && sharedSchedules.length === 0 && (
            <div className="bg-surface-container-lowest rounded-2xl p-12 shadow-sm text-center">
              <svg className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
              <p className="text-on-surface font-medium">{isEnglish ? "No schedules have been shared with you" : "Chưa có lịch nào được chia sẻ với bạn"}</p>
              <p className="text-sm text-on-surface-variant mt-1">{isEnglish ? "When a teammate shares a schedule, it will appear here." : "Khi đồng nghiệp chia sẻ lịch, nó sẽ xuất hiện ở đây."}</p>
            </div>
          )}
          {!loading && !error && sharedSchedules.length > 0 && (
            <div className="bg-surface-container-lowest rounded-2xl shadow-sm divide-y divide-surface-container-high">
              {sharedSchedules.map((s) => (
                <Link
                  key={s.id}
                  href={`/lich/${s.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-surface-container-low transition-colors"
                >
                  <div
                    className="w-1.5 h-12 rounded-full shrink-0"
                    style={{ backgroundColor: typeColors[s.item_type] || "#6750A4" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-on-surface truncate">{s.title}</p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {new Date(s.start_time).toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" })}
                      {" • "}
                      {new Date(s.start_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span
                    className="inline-block px-2 py-0.5 rounded-lg text-xs font-medium shrink-0"
                    style={{
                      backgroundColor: (typeColors[s.item_type] ?? "#6750A4") + "20",
                      color: typeColors[s.item_type] ?? "#6750A4",
                    }}
                  >
                    {typeLabels[s.item_type] ?? s.item_type}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "contacts" && (
        <div className="bg-surface-container-lowest rounded-2xl p-12 shadow-sm text-center">
          <svg className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          <p className="text-on-surface font-medium">{isEnglish ? "Contacts are under development" : "Tính năng danh bạ đang phát triển"}</p>
          <p className="text-sm text-on-surface-variant mt-1">{isEnglish ? "For now, you can share schedules directly by Mezon user ID." : "Hiện tại bạn có thể chia sẻ lịch trực tiếp bằng Mezon user ID."}</p>
        </div>
      )}

      {shareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-on-surface">{isEnglish ? "Share schedule" : "Chia sẻ lịch"}</h2>
                <p className="text-sm text-on-surface-variant mt-1">
                  {isEnglish ? "Share schedule view access with a Mezon user ID that has used the bot." : "Chia sẻ quyền xem lịch cho một Mezon user ID đã từng dùng bot."}
                </p>
              </div>
              <button type="button" onClick={() => setShareOpen(false)} className="p-2 rounded-lg hover:bg-surface-container">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <label className="block">
              <span className="block text-sm font-medium text-on-surface mb-1.5">{isEnglish ? "Schedule to share" : "Lịch cần chia sẻ"}</span>
              <select
                value={shareScheduleId}
                onChange={(e) => setShareScheduleId(e.target.value)}
                className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {ownSchedules.length === 0 && <option value="">{isEnglish ? "You do not have any schedules to share" : "Bạn chưa có lịch để chia sẻ"}</option>}
                {ownSchedules.map((schedule) => (
                  <option key={schedule.id} value={schedule.id}>
                    #{schedule.id} - {schedule.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-on-surface mb-1.5">Mezon user ID</span>
              <input
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="1998000377575772160"
                className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShareOpen(false)}
                className="px-5 py-2.5 border border-outline-variant rounded-xl text-on-surface font-medium text-sm hover:bg-surface-container transition-colors"
              >
                {isEnglish ? "Cancel" : "Hủy"}
              </button>
              <button
                type="button"
                onClick={handleShare}
                disabled={sharing || ownSchedules.length === 0}
                className="px-5 py-2.5 bg-primary text-on-primary rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {sharing ? (isEnglish ? "Sharing..." : "Đang chia sẻ...") : (isEnglish ? "Share" : "Chia sẻ")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
