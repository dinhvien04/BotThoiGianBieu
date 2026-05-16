"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserProfile } from "@/lib/hooks";
import * as api from "@/lib/api";

export default function ProfilePage() {
  const router = useRouter();
  const { data: profileData } = useUserProfile();
  const [form, setForm] = useState({
    fullName: "John Doe",
    email: "johndoe@company.com",
    phone: "+84 912 345 678",
    role: "Product Designer",
    bio: "Chuyên gia thiết kế sản phẩm với hơn 5 năm kinh nghiệm trong lĩnh vực UX/UI.",
  });

  useEffect(() => {
    if (profileData?.user) {
      setForm((prev) => ({
        ...prev,
        fullName: profileData.user.display_name ?? profileData.user.username ?? prev.fullName,
      }));
    }
  }, [profileData]);

  const handleLogout = async () => {
    console.log("Logout clicked!");
    try {
      await api.logout();
      window.location.href = "/dang-nhap";
    } catch (err) {
      alert("Đăng xuất thất bại!");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="dash-enter flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Hồ sơ cá nhân</h1>
        <button className="btn-press px-5 py-2.5 bg-primary text-on-primary rounded-xl font-medium text-sm hover:bg-primary/90">
          Lưu thay đổi
        </button>
      </div>

      {/* Avatar Section */}
      <div className="dash-enter dash-stagger-1 card-lift bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 bg-primary rounded-2xl flex items-center justify-center text-on-primary text-3xl font-bold">
              JD
            </div>
            <button aria-label="Đổi ảnh đại diện" className="avatar-fab btn-press absolute -bottom-2 -right-2 w-8 h-8 bg-surface-container-lowest border border-outline-variant rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-primary shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </button>
          </div>
          <div>
            <h2 className="text-xl font-bold text-on-surface">{form.fullName}</h2>
            <p className="text-sm text-on-surface-variant">{form.role}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2.5 py-1 bg-[#27AE60]/10 text-[#27AE60] text-xs font-medium rounded-full">Premium Plan</span>
              <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">Mezon Connected</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Info */}
        <div className="dash-enter dash-stagger-2 bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-on-surface mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            Thông tin cá nhân
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">Họ và tên</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">Số điện thoại</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">Chức vụ</label>
              <input
                type="text"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">Giới thiệu</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
              />
            </div>
          </div>
        </div>

        {/* Stats & Activity */}
        <div className="space-y-6">
          <div className="dash-enter dash-stagger-3 card-lift bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-on-surface mb-4">Hoạt động gần đây</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Tổng sự kiện", value: "156", color: "text-primary" },
                { label: "Hoàn thành", value: "128", color: "text-[#27AE60]" },
                { label: "Đang thực hiện", value: "23", color: "text-[#F2994A]" },
                { label: "Quá hạn", value: "5", color: "text-error" },
              ].map((stat) => (
                <div key={stat.label} className="bg-surface-container-low rounded-xl p-4 text-center">
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-on-surface-variant mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="dash-enter dash-stagger-4 card-lift bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-on-surface mb-4">Bảo mật</h3>
            <div className="space-y-3">
              <button className="btn-press w-full flex items-center justify-between p-3 bg-surface-container-low rounded-xl hover:bg-surface-container">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <span className="text-sm font-medium text-on-surface">Đổi mật khẩu</span>
                </div>
                <svg className="w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
              <button className="btn-press w-full flex items-center justify-between p-3 bg-surface-container-low rounded-xl hover:bg-surface-container">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  <span className="text-sm font-medium text-on-surface">Xác thực 2 lớp</span>
                </div>
                <span className="px-2 py-0.5 bg-[#27AE60]/10 text-[#27AE60] text-xs font-medium rounded-full">Đã bật</span>
              </button>
              <button type="button" onClick={handleLogout} className="btn-press w-full flex items-center justify-between p-3 bg-error/5 rounded-xl hover:bg-error/10">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                  <span className="text-sm font-medium text-error">Đăng xuất</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
