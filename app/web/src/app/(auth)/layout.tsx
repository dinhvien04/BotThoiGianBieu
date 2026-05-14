export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface flex">
      {/* Left: Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1C1B1F] text-white flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">FocusFlow Pro</h1>
          </div>
          <p className="text-gray-400 text-sm">Hệ thống quản lý thời gian biểu</p>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold leading-tight">
              Quản lý lịch trình<br />
              thông minh & hiệu quả
            </h2>
            <p className="text-gray-400 mt-4 max-w-md">
              Đồng bộ giữa Web Dashboard và Bot Mezon. Tạo, quản lý và theo dõi lịch trình của bạn mọi lúc, mọi nơi.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Người dùng", value: "10K+" },
              { label: "Sự kiện/ngày", value: "50K+" },
              { label: "Uptime", value: "99.9%" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 rounded-xl p-4">
                <p className="text-2xl font-bold text-primary-fixed-dim">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-500">&copy; 2024 FocusFlow Pro. All rights reserved.</p>
      </div>

      {/* Right: Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
