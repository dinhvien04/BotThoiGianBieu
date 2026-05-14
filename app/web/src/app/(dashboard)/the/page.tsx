"use client";

import { useState } from "react";
import { mockTags, mockSchedules } from "@/lib/mock-data";

export default function TagsPage() {
  const [selectedTag, setSelectedTag] = useState(mockTags[0]);

  const tagSchedules = mockSchedules.filter((s) => s.tags.includes(selectedTag.name));

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

          <button className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Tạo thẻ mới
          </button>

          <div className="space-y-2">
            {mockTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setSelectedTag(tag)}
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
            {/* Group by date */}
            {["HÔM NAY - 24 THÁNG 5, 2024", "NGÀY MAI - 25 THÁNG 5, 2024"].map((dateLabel, groupIdx) => (
              <div key={groupIdx}>
                <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider mb-3">{dateLabel}</p>
                <div className="space-y-3">
                  {tagSchedules.slice(groupIdx * 2, groupIdx * 2 + 2).map((schedule) => (
                    <div key={schedule.id} className="bg-white rounded-xl p-4 shadow-sm border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: selectedTag.color }}>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-on-surface">{schedule.title}</h3>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-on-surface-variant">
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {new Date(schedule.start).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - {new Date(schedule.end).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {schedule.location && (
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" />
                                </svg>
                                {schedule.location}
                              </span>
                            )}
                            {schedule.participants && (
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                                </svg>
                                Cùng với {schedule.participants[0]}
                              </span>
                            )}
                          </div>
                          {schedule.status === "hoan-thanh" && (
                            <p className="text-xs text-[#27AE60] mt-1.5 flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                              Đã hoàn thành
                            </p>
                          )}
                        </div>
                        <button className="p-1 text-on-surface-variant hover:bg-surface-container-high rounded">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

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
