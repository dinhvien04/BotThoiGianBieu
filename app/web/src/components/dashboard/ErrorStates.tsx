"use client";

interface ErrorStateProps {
  onRetry?: () => void;
}

export function ConnectionError({ onRetry }: ErrorStateProps) {
  return (
    <ErrorTemplate
      icon={
        <svg className="w-12 h-12 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      }
      title="Lỗi kết nối hệ thống"
      message="Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại."
      onRetry={onRetry}
    />
  );
}

export function MezonSyncError({ onRetry }: ErrorStateProps) {
  return (
    <ErrorTemplate
      icon={
        <div className="w-12 h-12 bg-[#F2994A]/10 rounded-xl flex items-center justify-center">
          <span className="text-2xl font-bold text-[#F2994A]">M</span>
        </div>
      }
      title="Lỗi đồng bộ Mezon"
      message="Không thể đồng bộ dữ liệu với Mezon Bot. Kết nối bot có thể đã hết hạn."
      onRetry={onRetry}
      retryLabel="Kết nối lại"
    />
  );
}

export function DataValidationError({ onRetry }: ErrorStateProps) {
  return (
    <ErrorTemplate
      icon={
        <svg className="w-12 h-12 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      }
      title="Lỗi nhập dữ liệu"
      message="Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường bắt buộc và định dạng."
      onRetry={onRetry}
      retryLabel="Thử lại"
    />
  );
}

export function DataLoadError({ onRetry }: ErrorStateProps) {
  return (
    <ErrorTemplate
      icon={
        <svg className="w-12 h-12 text-on-surface-variant/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
        </svg>
      }
      title="Lỗi tải dữ liệu"
      message="Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại sau."
      onRetry={onRetry}
    />
  );
}

export function NetworkError({ onRetry }: ErrorStateProps) {
  return (
    <ErrorTemplate
      icon={
        <svg className="w-12 h-12 text-[#F2994A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
        </svg>
      }
      title="Mạng không ổn định"
      message="Kết nối mạng không ổn định. Một số tính năng có thể không hoạt động bình thường."
      onRetry={onRetry}
      retryLabel="Thử lại kết nối"
    />
  );
}

function ErrorTemplate({
  icon,
  title,
  message,
  onRetry,
  retryLabel = "Thử lại",
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm text-center max-w-md mx-auto">
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="text-lg font-bold text-on-surface">{title}</h3>
      <p className="text-sm text-on-surface-variant mt-2 max-w-xs mx-auto">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 px-6 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
