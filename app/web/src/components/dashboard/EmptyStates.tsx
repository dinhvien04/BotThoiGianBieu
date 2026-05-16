"use client";

import Link from "next/link";

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "outline";
}

function EmptyTemplate({
  icon,
  title,
  message,
  actions,
  features,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  actions?: EmptyStateAction[];
  features?: { icon: React.ReactNode; label: string; desc: string }[];
}) {
  return (
    <div className="bg-white rounded-2xl p-10 shadow-sm text-center max-w-xl mx-auto">
      <div className="flex justify-center mb-6">{icon}</div>
      <h3 className="text-xl font-bold text-on-surface">{title}</h3>
      <p className="text-sm text-on-surface-variant mt-2 max-w-sm mx-auto leading-relaxed">{message}</p>
      {actions && actions.length > 0 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          {actions.map((action) =>
            action.href ? (
              <Link
                key={action.label}
                href={action.href}
                className={
                  action.variant === "outline"
                    ? "px-5 py-2.5 border border-outline-variant rounded-xl text-on-surface font-medium text-sm hover:bg-surface-container transition-colors flex items-center gap-2"
                    : "px-5 py-2.5 bg-primary text-on-primary rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors flex items-center gap-2"
                }
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {action.label}
              </Link>
            ) : (
              <button
                key={action.label}
                onClick={action.onClick}
                className={
                  action.variant === "outline"
                    ? "px-5 py-2.5 border border-outline-variant rounded-xl text-on-surface font-medium text-sm hover:bg-surface-container transition-colors flex items-center gap-2"
                    : "px-5 py-2.5 bg-primary text-on-primary rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors flex items-center gap-2"
                }
              >
                {action.variant === "outline" ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                )}
                {action.label}
              </button>
            ),
          )}
        </div>
      )}
      {features && features.length > 0 && (
        <>
          <div className="border-t border-outline-variant/50 my-6" />
          <div className="grid grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.label} className="text-center">
                <div className="flex justify-center mb-2">{f.icon}</div>
                <p className="text-xs font-semibold text-on-surface uppercase tracking-wider">{f.label}</p>
                <p className="text-xs text-on-surface-variant mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function DashboardEmpty() {
  return (
    <EmptyTemplate
      icon={
        <div className="relative w-32 h-32">
          <div className="absolute inset-2 bg-surface-container rounded-2xl" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
              </svg>
            </div>
          </div>
        </div>
      }
      title="Bắt đầu hành trình năng suất của bạn"
      message="Có vẻ như bạn chưa có lịch trình nào. Hãy tạo sự kiện đầu tiên để bắt đầu quản lý thời gian hiệu quả hơn."
      actions={[
        { label: "Tạo lịch đầu tiên", href: "/lich/tao-moi" },
        { label: "Sử dụng mẫu (Templates)", href: "/mau-lich", variant: "outline" },
      ]}
    />
  );
}

export function TagsEmpty() {
  return (
    <EmptyTemplate
      icon={
        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center">
          <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
          </svg>
        </div>
      }
      title="Chưa có Thẻ nào được tạo"
      message="Sử dụng Thẻ để nhóm các sự kiện theo chủ đề như Công việc, Cá nhân hoặc Dự án, giúp bạn lọc và quản lý lịch trình khoa học hơn."
      actions={[
        { label: "Tạo thẻ đầu tiên", onClick: () => {} },
        { label: "Tìm hiểu thêm", onClick: () => {}, variant: "outline" },
      ]}
      features={[
        {
          icon: (
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
          ),
          label: "Lọc nhanh chóng",
          desc: "Dễ dàng tìm thấy các nhiệm vụ cùng chủ đề chỉ với một cú nhấp.",
        },
        {
          icon: (
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
            </svg>
          ),
          label: "Màu sắc riêng biệt",
          desc: "Phân loại bằng màu sắc giúp nhận diện danh mục ngay lập tức trên lịch.",
        },
        {
          icon: (
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          ),
          label: "Tự động gợi ý",
          desc: "Hệ thống thông minh sẽ gợi ý thẻ dựa trên nội dung bạn nhập.",
        },
      ]}
    />
  );
}

export function TemplatesEmpty() {
  return (
    <EmptyTemplate
      icon={
        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center">
          <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </div>
      }
      title="Bạn chưa có Mẫu lịch nào"
      message="Tiết kiệm thời gian bằng cách lưu các lịch trình thường xuyên lặp lại thành mẫu. Bạn có thể tạo lịch mới chỉ với một cú nhấp chuột để duy trì tính hiệu quả và tập trung."
      actions={[
        { label: "Tạo mẫu đầu tiên", href: "/mau-lich" },
        { label: "Tìm hiểu thêm", onClick: () => {}, variant: "outline" },
      ]}
      features={[
        {
          icon: (
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" />
            </svg>
          ),
          label: "Nhanh chóng",
          desc: "Tạo lịch mới chỉ với 1 click.",
        },
        {
          icon: (
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          ),
          label: "Đồng bộ",
          desc: "Đồng bộ mẫu với Mezon bot.",
        },
        {
          icon: (
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: "Chính xác",
          desc: "Không sai sót khi tạo lịch.",
        },
      ]}
    />
  );
}
