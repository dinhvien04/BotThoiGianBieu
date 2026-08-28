"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { typeLabels, typeColors, priorityLabels, priorityColors, statusLabels, statusColors } from "@/lib/mock-data";
import DeleteConfirmDialog from "@/components/dashboard/DeleteConfirmDialog";
import { deleteSchedule, completeSchedule, getAuditLog, type AuditLogEntry } from "@/lib/api";
import { useScheduleById, apiToDisplay } from "@/lib/hooks";
import { useToast } from "@/components/dashboard/Toast";

function formatActionText(entry: AuditLogEntry): string {
  switch (entry.action) {
    case "create":
      return `Lịch được tạo bởi ${entry.user_id}`;
    case "update": {
      if (entry.changes) {
        const fields = Object.keys(entry.changes).join(", ");
        return `Cập nhật thông tin (${fields}) bởi ${entry.user_id}`;
      }
      return `Lịch được cập nhật bởi ${entry.user_id}`;
    }
    case "complete":
      return `Đánh dấu hoàn thành bởi ${entry.user_id}`;
    case "cancel":
      return `Đã hủy bởi ${entry.user_id}`;
    case "delete":
      return `Đã xóa bởi ${entry.user_id}`;
    case "restore":
      return `Đã khôi phục bởi ${entry.user_id}`;
    case "share-add":
      return `Chia sẻ lịch cho thành viên`;
    case "share-remove":
      return `Hủy chia sẻ lịch`;
    case "tag-add":
      return `Gắn thẻ mới vào lịch`;
    case "tag-remove":
      return `Gỡ thẻ khỏi lịch`;
    default:
      return `Hành động ${entry.action} bởi ${entry.user_id}`;
  }
}

function getActionColor(action: string): string {
  switch (action) {
    case "create":
      return "bg-primary";
    case "complete":
      return "bg-[#27AE60]";
    case "update":
      return "bg-[#2F80ED]";
    case "cancel":
    case "delete":
      return "bg-error";
    default:
      return "bg-on-surface-variant";
  }
}

export default function ScheduleDetailPage() {
  const [showDelete, setShowDelete] = useState(false);
  const [, setDeleting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const id = Number(params.id);
  const { data: apiSchedule, loading, refetch } = useScheduleById(id);
  const schedule = apiSchedule ? apiToDisplay(apiSchedule) : null;

  useEffect(() => {
    if (!id || isNaN(id)) return;
    let isMounted = true;
    setLoadingAudit(true);
    getAuditLog(id)
      .then((res) => {
        if (isMounted && res.success && Array.isArray(res.items)) {
          setAuditLogs(res.items);
        }
      })
      .catch(() => {
        // Fallback silently if audit log endpoint fails
      })
      .finally(() => {
        if (isMounted) setLoadingAudit(false);
      });
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleComplete = async () => {
    if (!schedule || schedule.status === "completed" || completing) return;
    setCompleting(true);
    try {
      await completeSchedule(id);
      showToast("Đã đánh dấu hoàn thành!", "success");
      refetch();
      // Reload audit log
      getAuditLog(id).then((res) => {
        if (res.success && Array.isArray(res.items)) {
          setAuditLogs(res.items);
        }
      });
    } catch {
      showToast("Không thể cập nhật trạng thái. Vui lòng thử lại.", "error");
    } finally {
      setCompleting(false);
    }
  };

  if (loading || !schedule) {
    return <div className="p-8 text-center text-on-surface-variant">Đang tải...</div>;
  }

  const startDate = new Date(schedule.start);
  const endDate = new Date(schedule.end);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <span className="uppercase font-semibold tracking-wider text-xs" style={{ color: typeColors[schedule.type] }}>
              {typeLabels[schedule.type]}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">{schedule.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleComplete}
            disabled={schedule.status === "completed" || completing}
            className="px-4 py-2 rounded-xl text-on-primary font-medium text-sm flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: statusColors[schedule.status] }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {schedule.status === "completed" ? "Đã hoàn thành" : completing ? "Đang lưu..." : "Hoàn thành"}
          </button>
          <Link
            href={`/lich/${id}/sua`}
            className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </Link>
          <button onClick={() => setShowDelete(true)} className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
          <Link href="/lich" className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <h2 className="font-bold text-on-surface uppercase text-sm tracking-wider">Mô tả chi tiết</h2>
            </div>
            <div className="p-4 bg-surface-container-low rounded-xl text-sm text-on-surface leading-relaxed">
              <p>{schedule.description || "Không có mô tả chi tiết."}</p>
            </div>
          </div>

          {/* Change History */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="font-bold text-on-surface uppercase text-sm tracking-wider">Lịch sử thay đổi</h2>
            </div>
            {loadingAudit ? (
              <div className="text-sm text-on-surface-variant py-4">Đang tải lịch sử...</div>
            ) : auditLogs.length > 0 ? (
              <div className="space-y-6">
                {auditLogs.map((item, idx) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${getActionColor(item.action)}`} />
                      {idx < auditLogs.length - 1 && <div className="w-0.5 flex-1 bg-surface-container-high mt-1" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-primary">
                        {new Date(item.created_at).toLocaleString("vi-VN")}
                      </p>
                      <p className="text-sm text-on-surface-variant mt-0.5">{formatActionText(item)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-on-surface-variant py-4">Chưa có bản ghi lịch sử thay đổi.</div>
            )}
          </div>
        </div>

        {/* Right Column - Metadata */}
        <div className="space-y-6">
          {/* Time */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="font-bold text-on-surface uppercase text-sm tracking-wider">Thời gian</h2>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-surface-container-low rounded-xl">
                <p className="text-xs text-on-surface-variant uppercase font-semibold">Bắt đầu</p>
                <p className="text-sm text-on-surface font-medium mt-0.5">
                  {startDate.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <p className="text-2xl font-bold text-on-surface">
                  {startDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl">
                <p className="text-xs text-on-surface-variant uppercase font-semibold">Kết thúc</p>
                <p className="text-sm text-on-surface font-medium mt-0.5">
                  {endDate.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <p className="text-2xl font-bold text-on-surface">
                  {endDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          </div>

          {/* Priority & Status */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-on-surface-variant font-semibold uppercase">Mức độ ưu tiên</p>
                <span className="inline-block mt-1 px-2 py-1 rounded-full text-xs font-bold text-on-primary" style={{ backgroundColor: priorityColors[schedule.priority] }}>
                  {priorityLabels[schedule.priority]}
                </span>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant font-semibold uppercase">Trạng thái</p>
                <span className="inline-block mt-1 px-2 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: statusColors[schedule.status] + "20", color: statusColors[schedule.status] }}>
                  {statusLabels[schedule.status]}
                </span>
              </div>
            </div>
          </div>

          {/* Reminder & Recurrence */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm space-y-4">
            {schedule.reminder && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  <span className="text-sm text-on-surface">Nhắc trước {schedule.reminder} phút</span>
                </div>
                <svg className="w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            )}
            {schedule.recurrence && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l1.657-1.657" />
                  </svg>
                  <span className="text-sm text-on-surface">
                    {schedule.recurrence === "daily" ? "Hàng ngày" : schedule.recurrence === "weekly" ? "Hàng tuần" : "Hàng tháng"}
                  </span>
                </div>
                <svg className="w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <p className="text-xs text-on-surface-variant font-semibold uppercase mb-3">Gắn thẻ</p>
            <div className="flex flex-wrap gap-2">
              {schedule.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 bg-surface-container rounded-full text-sm text-on-surface font-medium">
                  #{tag}
                </span>
              ))}
              <Link href="/the" className="px-3 py-1 text-primary text-sm font-medium hover:bg-primary/5 rounded-full">
                + Quản lý thẻ
              </Link>
            </div>
          </div>

          {/* Participants */}
          {schedule.participants && schedule.participants.length > 0 && (
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-on-surface-variant font-semibold uppercase">
                  Người tham gia ({schedule.participants.length})
                </p>
              </div>
              <div className="flex -space-x-2">
                {schedule.participants.map((p, i) => (
                  <div key={i} className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-xs font-bold text-primary border-2 border-white">
                    {p.charAt(0)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t border-surface-container-high">
        <div className="flex gap-4">
          <Link
            href="/nhac-viec"
            className="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.143 17.082a24.248 24.248 0 005.714 0m-5.714 0a23.849 23.849 0 01-5.455-1.31A8.967 8.967 0 016 9.75V9A6 6 0 0118 9v.75a8.967 8.967 0 01-2.312 6.022 23.848 23.848 0 01-5.455 1.31M9.143 17.082A3 3 0 0012 20.25a3 3 0 002.857-3.168" />
            </svg>
            <span className="text-xs">Nhắc việc</span>
          </Link>
          <Link
            href={`/lich/tao-moi?template=${encodeURIComponent(schedule.title)}`}
            className="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.5a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
            </svg>
            <span className="text-xs">Nhân bản</span>
          </Link>
        </div>
        <Link
          href="/chia-se"
          className="flex items-center gap-2 px-4 py-2 text-primary border border-primary/30 rounded-xl hover:bg-primary/5 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
          Chia sẻ lịch
        </Link>
      </div>

      <DeleteConfirmDialog
        isOpen={showDelete}
        title={`Bạn có chắc muốn xóa "${schedule.title}"?`}
        description="Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan sẽ bị xóa vĩnh viễn."
        onConfirm={async () => {
          setDeleting(true);
          try {
            await deleteSchedule(id);
            setShowDelete(false);
            showToast("Xóa lịch thành công!", "success");
            router.refresh();
            router.push("/lich");
          } catch {
            showToast("Không thể xóa. Vui lòng thử lại.", "error");
            setShowDelete(false);
          } finally {
            setDeleting(false);
          }
        }}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
