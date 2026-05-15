import type { Metadata } from "next";
import DashboardShell from "./dashboard-shell";

export const metadata: Metadata = {
  title: {
    default: "Bảng điều khiển",
    template: "%s | Productivity Flow",
  },
  // Khu vực sau đăng nhập — không cho công cụ tìm kiếm index
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
