"use client";

import { useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { SWRConfig } from "swr";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import { ToastProvider } from "@/components/dashboard/Toast";
import { ProfileProvider } from "@/components/dashboard/ProfileContext";
import { LanguageProvider, useLanguage } from "@/components/dashboard/LanguageContext";
import { swrConfig } from "@/lib/swr-config";

/**
 * Các route ẨN nút FAB "Tạo mới" trên mobile.
 * - Form tạo/sửa: tránh điều hướng rời khỏi form đang nhập.
 * - Settings/Admin/Profile: không phải overview, action FAB không phù hợp.
 */
const FAB_HIDDEN_PREFIXES = [
  "/lich/tao-moi",
  "/cai-dat",
  "/admin",
  "/ho-so",
  "/tro-giup",
  "/thong-bao",
];

function isFabHidden(pathname: string): boolean {
  if (FAB_HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return true;
  }
  // /lich/[id]/sua hoặc bất kỳ trang chỉnh sửa lịch nào
  if (/^\/lich\/[^/]+\/(sua|edit)/.test(pathname)) return true;
  return false;
}

function MobileCreateFab() {
  const { t } = useLanguage();

  return (
    <Link
      href="/lich/tao-moi"
      className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-primary text-on-primary rounded-[1rem] shadow-lg flex items-center justify-center hover:bg-primary/90 transition-transform active:scale-90 z-40"
      aria-label={t("common.createNew")}
    >
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    </Link>
  );
}

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const showFab = useMemo(() => !isFabHidden(pathname ?? ""), [pathname]);

  // Tự đóng sidebar khi điều hướng (chủ yếu cho mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Khoá scroll body khi mở sidebar trên mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <SWRConfig value={swrConfig}>
      <LanguageProvider>
        <ProfileProvider>
          <ToastProvider>
            <div data-dashboard-shell className="min-h-screen bg-surface-container-low text-on-surface">
              <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
              <div className="lg:ml-sidebar-width">
                <Topbar onMenuClick={() => setSidebarOpen((v) => !v)} />
                <main className={`p-3 sm:p-4 md:p-6 ${showFab ? "pb-24 lg:pb-6" : "pb-6"}`}>{children}</main>
              </div>

              {/* Mobile FAB — chỉ hiện ở trang overview/list */}
              {showFab && <MobileCreateFab />}
            </div>
          </ToastProvider>
        </ProfileProvider>
      </LanguageProvider>
    </SWRConfig>
  );
}
