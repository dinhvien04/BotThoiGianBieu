"use client";

import { useState } from "react";
import { useTags, useSchedules } from "@/lib/hooks";
import { createTag, deleteTag } from "@/lib/api";

const defaultColors = ["#6750A4", "#F2994A", "#27AE60", "#2F80ED", "#EB5757", "#9B51E0"];

export default function TagsPage() {
  const { data: apiTags, refetch: refetchTags } = useTags();
  const tags = (apiTags ?? []).map((t, i) => ({
    ...t,
    color: t.color || defaultColors[i % defaultColors.length],
    count: 0,
  }));
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const selectedTag = tags.find((t) => t.id === selectedTagId) ?? tags[0] ?? { id: 0, name: "Chưa có thẻ", color: "#6750A4", count: 0, user_id: "", created_at: "" };

  const handleCreateTag = async () => {
    const name = prompt("Nhập tên thẻ mới (a-z, 0-9, -, _):");
    if (!name) return;
    await createTag(name);
    refetchTags();
  };

  const handleDeleteTag = async (name: string) => {
    if (!confirm(`Xóa thẻ "${name}"?`)) return;
    await deleteTag(name);
    refetchTags();
  };

  const { data: scheduleData } = useSchedules({ limit: 50 });
  const tagSchedules = (scheduleData?.items ?? []).filter(
    (s) => s.tags?.some((t) => t.name === selectedTag.name),
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
        {/* Left - Tag List */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Quản lý Thẻ</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Tổ chức công việc theo danh mục
            </p>
          </div>

          <button onClick={handleCreateTag} className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Tạo thẻ mới
          </button>

          <div className="space-y-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setSelectedTagId(tag.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                  selectedTag.id === tag.id
                    ? "bg-primary text-white"
                    : "bg-white hover:bg-surface-container-high text-on-surface"
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: selectedTag.id === tag.id ? "#fff" : tag.color }}
                />
                <div className="flex-1">
                  <p className="font-medium">{tag.name}</p>
                  <p className={`text-xs ${selectedTag.id === tag.id ? "text-white/70" : "text-on-surface-variant"}`}>
                    {tag.count} sự kiện
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right - Tag Events */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: selectedTag.color + "20" }}>
                <svg className="w-4 h-4" style={{ color: selectedTag.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-on-surface">
                  Lịch trình thuộc thẻ: <span style={{ color: selectedTag.color }}>{selectedTag.name}</span>
                </h2>
                <p className="text-xs text-on-surface-variant">
                  Đang hiển thị các sự kiện được gắn nhãn này
                </p>
              </div>
            </div>
            <button className="text-primary text-sm font-medium hover:underline">
              Xem tất cả &rarr;
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              {tagSchedules.map((schedule) => (
                <div key={schedule.id} className="bg-white rounded-xl p-4 shadow-sm border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: selectedTag.color }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-on-surface">{schedule.title}</h3>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(schedule.start_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - {schedule.end_time ? new Date(schedule.end_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </div>
                      {schedule.status === "completed" && (
                        <p className="text-xs text-[#27AE60] mt-1.5 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          Đã hoàn thành
                        </p>
                      )}
                    </div>
                    <button onClick={() => handleDeleteTag(selectedTag.name)} className="p-1 text-on-surface-variant hover:bg-surface-container-high rounded">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {tagSchedules.length === 0 && (
              <div className="text-center py-12 text-on-surface-variant">
                <p>Chưa có sự kiện nào được gắn thẻ &ldquo;{selectedTag.name}&rdquo;</p>
              </div>
            )}
          </div>

          {/* Tip */}
          <div className="mt-6 bg-surface-container-low rounded-xl p-4 flex gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-on-surface">Mẹo nhỏ</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Sử dụng màu sắc tương phản để phân biệt nhanh các dự án quan trọng trên lịch trình của bạn.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
