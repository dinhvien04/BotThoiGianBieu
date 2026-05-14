"use client";

const weekDays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];

const barData = [
  { thisWeek: 5.5, lastWeek: 4.0 },
  { thisWeek: 4.0, lastWeek: 6.0 },
  { thisWeek: 6.5, lastWeek: 5.0 },
  { thisWeek: 5.0, lastWeek: 4.5 },
  { thisWeek: 7.0, lastWeek: 5.5 },
  { thisWeek: 3.5, lastWeek: 2.0 },
  { thisWeek: 2.0, lastWeek: 1.5 },
];

const maxBarValue = 8;

const historyLog = [
  { time: "10:45 AM, Hôm nay", action: "Hoàn thành", task: "Thiết kế UI Dashboard", status: "Thành công", statusColor: "#27AE60" },
  { time: "08:12 AM, Hôm nay", action: "Cập nhật", task: "Viết tài liệu API NestJS", status: "Đã lưu", statusColor: "#2D9CDB" },
];

export default function StatisticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Thống kê hiệu suất</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Dữ liệu được đồng bộ trực tiếp từ hệ thống NestJS của bạn.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 border border-outline-variant rounded-xl text-sm font-medium text-on-surface hover:bg-surface-container transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            7 ngày qua
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Xuất báo cáo
          </button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="col-span-2 bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-on-surface text-lg">Hiệu suất hoàn thành công việc</h2>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-primary" />
                <span className="text-on-surface-variant">Tuần này</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-primary/30" />
                <span className="text-on-surface-variant">Tuần trước</span>
              </div>
            </div>
          </div>
          <div className="flex items-end gap-4 h-48">
            {weekDays.map((day, idx) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex items-end gap-1 w-full justify-center h-40">
                  <div
                    className="w-5 bg-primary/30 rounded-t"
                    style={{ height: `${(barData[idx].lastWeek / maxBarValue) * 100}%` }}
                  />
                  <div
                    className="w-5 bg-primary rounded-t"
                    style={{ height: `${(barData[idx].thisWeek / maxBarValue) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-on-surface-variant">{day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Donut Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-on-surface text-lg mb-6">Phân bổ theo Tag</h2>
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-36 h-36">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#E8DEF8" strokeWidth="4" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#6750A4" strokeWidth="4" strokeDasharray="66 22" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#F2994A" strokeWidth="4" strokeDasharray="0 66 15 7" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#27AE60" strokeWidth="4" strokeDasharray="0 81 7 0" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-on-surface">75%</span>
                <span className="text-xs text-on-surface-variant">Làm việc</span>
              </div>
            </div>
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-on-surface">Công việc</span>
              </div>
              <span className="font-medium text-on-surface">12.5h</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#F2994A]" />
                <span className="text-on-surface">Học tập</span>
              </div>
              <span className="font-medium text-on-surface">4.2h</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#27AE60]" />
                <span className="text-on-surface">Cá nhân</span>
              </div>
              <span className="font-medium text-on-surface">2.8h</span>
            </div>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="font-bold text-on-surface text-lg">Lịch sử thay đổi hệ thống</h2>
          <button className="text-primary text-sm font-medium hover:underline">Xem tất cả</button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-container-high">
              <th className="text-left px-6 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Thời gian</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Hành động</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Nhiệm vụ</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Trạng thái</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container-high">
            {historyLog.map((item, idx) => (
              <tr key={idx} className="hover:bg-surface-container-low">
                <td className="px-6 py-4 text-sm text-on-surface-variant">{item.time}</td>
                <td className="px-6 py-4 text-sm text-on-surface">{item.action}</td>
                <td className="px-6 py-4 text-sm font-medium text-on-surface">{item.task}</td>
                <td className="px-6 py-4">
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium text-white" style={{ backgroundColor: item.statusColor }}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button className="text-on-surface-variant hover:text-on-surface">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-primary rounded-2xl p-6 text-white">
          <p className="text-sm opacity-80">Tổng thời gian tập trung</p>
          <p className="text-4xl font-bold mt-1">34.5h</p>
          <div className="flex items-center gap-1 mt-2 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
            +12% so với tuần trước
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <p className="text-sm text-on-surface-variant">Nhiệm vụ hoàn thành</p>
          <p className="text-4xl font-bold text-on-surface mt-1">82</p>
          <div className="flex items-center gap-1 mt-2 text-sm text-[#27AE60]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            95% tỷ lệ hoàn thành
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <p className="text-sm text-on-surface-variant">Dự án hoạt động</p>
          <p className="text-4xl font-bold text-on-surface mt-1">12</p>
          <div className="flex items-center gap-1 mt-2 text-sm text-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v2.25A2.25 2.25 0 006 10.5zm0 9.75h2.25A2.25 2.25 0 0010.5 18v-2.25a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25V18A2.25 2.25 0 006 20.25zm9.75-9.75H18a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0018 3.75h-2.25A2.25 2.25 0 0013.5 6v2.25a2.25 2.25 0 002.25 2.25z" />
            </svg>
            4 dự án mới tháng này
          </div>
        </div>
      </div>
    </div>
  );
}
