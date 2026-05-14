"use client";

import { useState } from "react";
import Link from "next/link";

export default function ConnectMezonPage() {
  const [step, setStep] = useState<"intro" | "connecting" | "done">("intro");

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-on-surface">Kết nối Mezon</h2>
        <p className="text-sm text-on-surface-variant mt-2">
          Liên kết tài khoản Mezon để sử dụng bot quản lý lịch.
        </p>
      </div>

      {step === "intro" && (
        <div className="space-y-6">
          <div className="bg-surface-container-low rounded-2xl p-6 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl font-bold text-primary">M</span>
            </div>
            <h3 className="font-bold text-on-surface">FocusFlow Pro + Mezon</h3>
            <p className="text-sm text-on-surface-variant mt-2 max-w-sm mx-auto">
              Kết nối để nhận thông báo, tạo lịch bằng lệnh chat, và đồng bộ dữ liệu realtime.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: "🔔", title: "Nhắc nhở tự động", desc: "Nhận thông báo trước sự kiện qua Mezon chat" },
              { icon: "⌨️", title: "Quản lý bằng lệnh", desc: "Dùng *them-lich, *lich-hom-nay... ngay trong chat" },
              { icon: "🔄", title: "Đồng bộ realtime", desc: "Thay đổi trên web tự động cập nhật trên bot" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 p-3 bg-surface-container-low rounded-xl">
                <span className="text-xl">{item.icon}</span>
                <div>
                  <p className="text-sm font-medium text-on-surface">{item.title}</p>
                  <p className="text-xs text-on-surface-variant">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep("connecting")}
            className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            Kết nối với Mezon
          </button>

          <Link href="/dang-nhap" className="block text-center text-sm text-on-surface-variant hover:text-primary">
            Bỏ qua, đăng nhập trước
          </Link>
        </div>
      )}

      {step === "connecting" && (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="font-medium text-on-surface">Đang kết nối với Mezon...</p>
          <p className="text-sm text-on-surface-variant">Vui lòng chờ trong giây lát</p>
          <button onClick={() => setStep("done")} className="mt-4 text-sm text-primary hover:underline">
            Giả lập kết nối thành công
          </button>
        </div>
      )}

      {step === "done" && (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 bg-[#27AE60]/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-[#27AE60]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-bold text-on-surface">Kết nối thành công!</h3>
          <p className="text-sm text-on-surface-variant">Tài khoản Mezon đã được liên kết với FocusFlow Pro.</p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            Bắt đầu sử dụng
          </Link>
        </div>
      )}
    </div>
  );
}
