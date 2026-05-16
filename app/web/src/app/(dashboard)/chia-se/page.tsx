"use client";

import { useState } from "react";
import Link from "next/link";
import { mockSchedules, typeColors, typeLabels } from "@/lib/mock-data";

const sharedSchedules = mockSchedules.filter((s) => s.participants && s.participants.length > 0);

const contacts = [
  { id: 1, name: "Nguyễn Văn An", email: "an@company.com", avatar: "NA", role: "Designer" },
  { id: 2, name: "Trần Thị Bình", email: "binh@company.com", avatar: "TB", role: "Developer" },
  { id: 3, name: "Lê Hoàng Cường", email: "cuong@company.com", avatar: "LC", role: "PM" },
  { id: 4, name: "Phạm Minh Dũng", email: "dung@company.com", avatar: "PD", role: "Tester" },
  { id: 5, name: "Hoàng Thị Hoa", email: "hoa@company.com", avatar: "HH", role: "BA" },
];

export default function SharePage() {
  const [tab, setTab] = useState<"shared" | "contacts">("shared");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Chia sẻ</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Quản lý lịch chia sẻ và danh bạ đồng nghiệp.
          </p>
        </div>
        <button className="px-5 py-2.5 bg-primary text-on-primary rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
          Chia sẻ lịch mới
        </button>
      </div>

      <div className="flex gap-1 bg-surface-container rounded-xl p-1">
        <button
          onClick={() => setTab("shared")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === "shared" ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant"}`}
        >
          Lịch đã chia sẻ ({sharedSchedules.length})
        </button>
        <button
          onClick={() => setTab("contacts")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === "contacts" ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant"}`}
        >
          Danh bạ ({contacts.length})
        </button>
      </div>

      {tab === "shared" && (
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm divide-y divide-surface-container-high">
          {sharedSchedules.map((s) => (
            <Link
              key={s.id}
              href={`/lich/${s.id}`}
              className="flex items-center gap-4 p-4 hover:bg-surface-container-low transition-colors"
            >
              <div
                className="w-1.5 h-12 rounded-full shrink-0"
                style={{ backgroundColor: typeColors[s.type] || "#6750A4" }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-on-surface truncate">{s.title}</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  {new Date(s.start).toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" })}
                  {" • "}
                  {new Date(s.start).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex -space-x-2">
                  {(s.participants || []).slice(0, 3).map((p, i) => (
                    <div key={i} className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center border-2 border-white">
                      {p.charAt(0)}
                    </div>
                  ))}
                  {(s.participants || []).length > 3 && (
                    <div className="w-7 h-7 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold flex items-center justify-center border-2 border-white">
                      +{(s.participants || []).length - 3}
                    </div>
                  )}
                </div>
                <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-medium" style={{ backgroundColor: typeColors[s.type] + "20", color: typeColors[s.type] }}>
                  {typeLabels[s.type]}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === "contacts" && (
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm divide-y divide-surface-container-high">
          {contacts.map((c) => (
            <div key={c.id} className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-full bg-primary text-on-primary font-bold text-sm flex items-center justify-center">
                {c.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-on-surface">{c.name}</p>
                <p className="text-xs text-on-surface-variant">{c.email}</p>
              </div>
              <span className="px-2.5 py-1 bg-surface-container rounded-lg text-xs font-medium text-on-surface-variant">
                {c.role}
              </span>
              <button className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
