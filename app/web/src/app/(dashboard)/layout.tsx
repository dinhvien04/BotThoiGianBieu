import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-container-low">
      <Sidebar />
      <div className="ml-sidebar-width">
        <Topbar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
