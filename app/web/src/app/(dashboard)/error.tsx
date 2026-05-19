"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error boundary:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-error-container/30 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-on-surface mb-2">Đã xảy ra lỗi</h1>
        <p className="text-sm text-on-surface-variant mb-6">
          Một lỗi không mong muốn đã xảy ra. Bạn có thể thử lại hoặc tải lại trang.
        </p>
        {error.digest && (
          <p className="text-xs text-on-surface-variant/60 mb-4 font-mono">
            Mã lỗi: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-primary text-on-primary rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            Thử lại
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 border border-outline-variant text-on-surface rounded-xl font-medium text-sm hover:bg-surface-container transition-colors"
          >
            Tải lại trang
          </button>
        </div>
      </div>
    </div>
  );
}
