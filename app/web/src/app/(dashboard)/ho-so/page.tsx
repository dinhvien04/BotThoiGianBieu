"use client";

import { useEffect, useMemo, useState } from "react";
import { useProfile } from "@/components/dashboard/ProfileContext";
import { useToast } from "@/components/dashboard/Toast";
import * as api from "@/lib/api";

interface ProfileForm {
  fullName: string;
  email: string;
  phone: string;
  jobTitle: string;
  bio: string;
}

const EMPTY_FORM: ProfileForm = {
  fullName: "",
  email: "",
  phone: "",
  jobTitle: "",
  bio: "",
};

function formFromUser(user: api.UserProfile | null): ProfileForm {
  if (!user) return EMPTY_FORM;
  return {
    fullName: user.display_name ?? user.username ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    jobTitle: user.job_title ?? "",
    bio: user.bio ?? "",
  };
}

function sameForm(a: ProfileForm, b: ProfileForm): boolean {
  return (
    a.fullName === b.fullName &&
    a.email === b.email &&
    a.phone === b.phone &&
    a.jobTitle === b.jobTitle &&
    a.bio === b.bio
  );
}

function roleLabel(role?: "user" | "admin"): string {
  return role === "admin" ? "Quản trị viên" : "Người dùng";
}

function toNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function ProfilePage() {
  const profileCtx = useProfile();
  const { showToast } = useToast();
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [savedForm, setSavedForm] = useState<ProfileForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const accountRole = roleLabel(profileCtx.user?.role);
  const dirty = useMemo(() => !sameForm(form, savedForm), [form, savedForm]);

  useEffect(() => {
    const next = formFromUser(profileCtx.user);
    setForm(next);
    setSavedForm(next);
  }, [profileCtx.user]);

  const avatarInitial =
    (form.fullName || profileCtx.user?.username || "?").trim().charAt(0).toUpperCase() || "?";

  const setField = (key: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCancel = () => {
    setForm(savedForm);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const result = await api.updateUserProfile({
        display_name: toNullable(form.fullName),
        email: toNullable(form.email),
        phone: toNullable(form.phone),
        job_title: toNullable(form.jobTitle),
        bio: toNullable(form.bio),
      });
      if (!result.success) {
        throw new Error(result.error ?? "Không lưu được hồ sơ");
      }
      const next = formFromUser(result.user);
      setForm(next);
      setSavedForm(next);
      profileCtx.refetch();
      showToast("Đã lưu hồ sơ", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không lưu được hồ sơ", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      window.location.href = "/dang-nhap";
    } catch {
      showToast("Đăng xuất thất bại", "error");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="dash-enter flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Hồ sơ cá nhân</h1>
        {dirty && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="btn-press px-5 py-2.5 bg-surface-container-lowest border border-outline-variant text-on-surface rounded-xl font-medium text-sm hover:bg-surface-container disabled:opacity-60"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              form="profile-form"
              disabled={saving}
              className="btn-press px-5 py-2.5 bg-primary text-on-primary rounded-xl font-medium text-sm hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        )}
      </div>

      <div className="dash-enter dash-stagger-1 card-lift bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 bg-primary rounded-2xl flex items-center justify-center text-on-primary text-3xl font-bold">
              {avatarInitial}
            </div>
            <button
              type="button"
              aria-label="Đổi ảnh đại diện"
              className="avatar-fab btn-press absolute -bottom-2 -right-2 w-8 h-8 bg-surface-container-lowest border border-outline-variant rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-primary shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </button>
          </div>
          <div>
            <h2 className="text-xl font-bold text-on-surface">{form.fullName || profileCtx.user?.username || "-"}</h2>
            <p className="text-sm text-on-surface-variant">{form.jobTitle || accountRole}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2.5 py-1 bg-[#27AE60]/10 text-[#27AE60] text-xs font-medium rounded-full">
                Đã kết nối Mezon
              </span>
              <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                {accountRole}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form id="profile-form" onSubmit={handleSave} className="dash-enter dash-stagger-2 bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
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
                maxLength={150}
                onChange={(e) => setField("fullName", e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                maxLength={255}
                onChange={(e) => setField("email", e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">Số điện thoại</label>
              <input
                type="tel"
                value={form.phone}
                maxLength={50}
                onChange={(e) => setField("phone", e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">Chức vụ</label>
              <input
                type="text"
                value={form.jobTitle}
                maxLength={120}
                onChange={(e) => setField("jobTitle", e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">Giới thiệu</label>
              <textarea
                value={form.bio}
                maxLength={1000}
                onChange={(e) => setField("bio", e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
              />
            </div>
          </div>
        </form>

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
              <div className="w-full flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <span className="text-sm font-medium text-on-surface">Đăng nhập qua Mezon</span>
                </div>
                <span className="px-2 py-0.5 bg-[#27AE60]/10 text-[#27AE60] text-xs font-medium rounded-full">
                  Đang kết nối
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="btn-press w-full flex items-center justify-between p-3 bg-error/5 rounded-xl hover:bg-error/10"
              >
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
