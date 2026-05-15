"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import { ToastProvider } from "@/components/dashboard/Toast";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

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
    <ToastProvider>
      <div className="min-h-screen bg-surface-container-low">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="lg:ml-sidebar-width">
          <Topbar onMenuClick={() => setSidebarOpen((v) => !v)} />
          <main className="p-3 sm:p-4 md:p-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
