"use client";

import { useState } from "react";
import Link from "next/link";

const steps = [
  {
    title: "Chào mừng đến FocusFlow Pro!",
    subtitle: "Hãy cùng thiết lập không gian làm việc của bạn",
    content: "welcome",
  },
  {
    title: "Thiết lập giờ làm việc",
    subtitle: "Cho chúng tôi biết thời gian bạn thường xuyên hoạt động",
    content: "work-hours",
  },
  {
    title: "Kết nối Mezon",
    subtitle: "Đồng bộ với bot trên Mezon để nhận thông báo",
    content: "mezon",
  },
  {
    title: "Tất cả đã sẵn sàng!",
    subtitle: "Bạn đã hoàn thành thiết lập ban đầu",
    content: "done",
  },
];

const workDays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [selectedDays, setSelectedDays] = useState([0, 1, 2, 3, 4]);
  const [workStart, setWorkStart] = useState("08:00");
  const [workEnd, setWorkEnd] = useState("17:00");

  const current = steps[step];

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-surface-container-high"
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-on-surface">{current.title}</h1>
            <p className="text-sm text-on-surface-variant mt-2">{current.subtitle}</p>
          </div>

          {/* Step 1: Welcome */}
          {current.content === "welcome" && (
            <div className="space-y-4">
              {[
                { icon: "📅", title: "Quản lý lịch trình", desc: "Tạo, sắp xếp và theo dõi các sự kiện hàng ngày" },
                { icon: "🔔", title: "Nhắc nhở thông minh", desc: "Không bao giờ bỏ lỡ sự kiện quan trọng" },
                { icon: "📊", title: "Thống kê năng suất", desc: "Hiểu rõ thời gian bạn sử dụng như thế nào" },
                { icon: "🤖", title: "Bot Mezon tích hợp", desc: "Quản lý lịch ngay trong Mezon chat" },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4 p-4 bg-surface-container-low rounded-xl">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="font-medium text-on-surface">{item.title}</p>
                    <p className="text-sm text-on-surface-variant mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Work Hours */}
          {current.content === "work-hours" && (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-on-surface mb-3">Chọn ngày làm việc</p>
                <div className="flex gap-2 justify-center">
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
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        selectedDays.includes(idx)
                          ? "bg-primary text-white"
                          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4 justify-center">
                <div>
                  <label className="block text-xs text-on-surface-variant uppercase font-semibold mb-1.5">Bắt đầu</label>
                  <input
                    type="time"
                    value={workStart}
                    onChange={(e) => setWorkStart(e.target.value)}
                    className="px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-lg font-bold"
                  />
                </div>
                <svg className="w-6 h-6 text-on-surface-variant mt-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
                <div>
                  <label className="block text-xs text-on-surface-variant uppercase font-semibold mb-1.5">Kết thúc</label>
                  <input
                    type="time"
                    value={workEnd}
                    onChange={(e) => setWorkEnd(e.target.value)}
                    className="px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-lg font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Mezon */}
          {current.content === "mezon" && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-3xl font-bold text-primary">M</span>
              </div>
              <p className="text-sm text-on-surface-variant max-w-md mx-auto">
                Kết nối tài khoản Mezon để nhận thông báo nhắc nhở, tạo lịch bằng lệnh chat, và đồng bộ danh bạ.
              </p>
              <button className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                Kết nối Mezon
              </button>
              <button className="block mx-auto text-sm text-on-surface-variant hover:text-on-surface">
                Bỏ qua bước này
              </button>
            </div>
          )}

          {/* Step 4: Done */}
          {current.content === "done" && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-[#27AE60]/10 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-10 h-10 text-[#27AE60]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-on-surface font-medium">Mọi thứ đã được thiết lập!</p>
                <p className="text-sm text-on-surface-variant mt-1">
                  Hãy bắt đầu tạo lịch trình đầu tiên của bạn.
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Link
                  href="/lich/tao-moi"
                  className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
                >
                  Tạo lịch đầu tiên
                </Link>
                <Link
                  href="/dashboard"
                  className="px-6 py-3 border border-outline-variant rounded-xl text-on-surface font-medium hover:bg-surface-container transition-colors"
                >
                  Đi tới Dashboard
                </Link>
              </div>
            </div>
          )}

          {/* Navigation */}
          {current.content !== "done" && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-surface-container-high">
              <button
                onClick={() => setStep(Math.max(0, step - 1))}
                className={`px-5 py-2.5 border border-outline-variant rounded-xl text-on-surface font-medium text-sm hover:bg-surface-container transition-colors ${step === 0 ? "invisible" : ""}`}
              >
                Quay lại
              </button>
              <span className="text-sm text-on-surface-variant">
                Bước {step + 1} / {steps.length}
              </span>
              <button
                onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
                className="px-5 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
              >
                {step === steps.length - 2 ? "Hoàn tất" : "Tiếp tục"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
