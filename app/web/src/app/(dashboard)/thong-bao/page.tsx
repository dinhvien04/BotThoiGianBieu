"use client";

import { useState } from "react";

interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  type: "reminder" | "system" | "share" | "update";
  read: boolean;
}

const notifications: Notification[] = [
  { id: 1, title: "Sắp tới: Họp đầu tuần Team Marketing", message: "Sự kiện bắt đầu trong 15 phút. Phòng họp 01, Tầng 3.", time: "Vừa xong", type: "reminder", read: false },
  { id: 2, title: "Trần Thị Bình đã chia sẻ lịch", message: "Review Sprint Q3 - Thứ Sáu, 25/10/2024 lúc 14:00", time: "5 phút trước", type: "share", read: false },
  { id: 3, title: "Nhắc nhở: Deep Work", message: "Phiên tập trung cao sẽ bắt đầu lúc 14:00 hôm nay.", time: "30 phút trước", type: "reminder", read: false },
  { id: 4, title: "Hệ thống: Cập nhật thành công", message: "Cài đặt múi giờ đã được cập nhật thành Asia/Ho_Chi_Minh.", time: "1 giờ trước", type: "system", read: true },
  { id: 5, title: "Lịch đã được cập nhật", message: "Viết tài liệu API NestJS đã thay đổi mức ưu tiên thành Cao.", time: "2 giờ trước", type: "update", read: true },
  { id: 6, title: "Nhắc nhở: Phỏng vấn ứng viên", message: "Phỏng vấn Senior Designer lúc 10:00 ngày mai.", time: "3 giờ trước", type: "reminder", read: true },
  { id: 7, title: "Lê Hoàng Cường đã bình luận", message: "Đã thêm ghi chú vào Kick-off dự án SmartHome 2.0.", time: "5 giờ trước", type: "share", read: true },
  { id: 8, title: "Hệ thống: Bảo trì định kỳ", message: "Hệ thống sẽ bảo trì từ 02:00 - 04:00 ngày 26/10.", time: "Hôm qua", type: "system", read: true },
];

const typeConfig: Record<string, { color: string; icon: string }> = {
  reminder: { color: "#F2994A", icon: "M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" },
  system: { color: "#2196F3", icon: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" },
  share: { color: "#6750A4", icon: "M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" },
  update: { color: "#27AE60", icon: "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" },
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [items, setItems] = useState(notifications);

  const filtered = filter === "unread" ? items.filter((n) => !n.read) : items;
  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Thông báo</h1>
          <p className="text-sm text-on-surface-variant mt-1">{unreadCount} thông báo chưa đọc</p>
        </div>
        <button
          onClick={() => setItems(items.map((n) => ({ ...n, read: true })))}
          className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-xl transition-colors"
        >
          Đánh dấu đã đọc tất cả
        </button>
      </div>

      <div className="flex gap-1 bg-surface-container rounded-xl p-1">
        <button
          onClick={() => setFilter("all")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${filter === "all" ? "bg-white text-on-surface shadow-sm" : "text-on-surface-variant"}`}
        >
          Tất cả ({items.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${filter === "unread" ? "bg-white text-on-surface shadow-sm" : "text-on-surface-variant"}`}
        >
          Chưa đọc ({unreadCount})
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm divide-y divide-surface-container-high">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            <p className="text-on-surface-variant text-sm">Không có thông báo chưa đọc</p>
          </div>
        ) : (
          filtered.map((n) => {
            const config = typeConfig[n.type];
            return (
              <button
                key={n.id}
                onClick={() => setItems(items.map((i) => (i.id === n.id ? { ...i, read: true } : i)))}
                className={`w-full flex items-start gap-4 p-4 text-left hover:bg-surface-container-low transition-colors ${!n.read ? "bg-primary/3" : ""}`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: config.color + "15" }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={config.color} strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${!n.read ? "font-bold" : "font-medium"} text-on-surface truncate`}>
                      {n.title}
                    </p>
                    {!n.read && <span className="w-2 h-2 bg-primary rounded-full shrink-0" />}
                  </div>
                  <p className="text-sm text-on-surface-variant mt-0.5 line-clamp-1">{n.message}</p>
                  <p className="text-xs text-on-surface-variant/60 mt-1">{n.time}</p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
