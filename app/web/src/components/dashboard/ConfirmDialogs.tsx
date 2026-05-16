"use client";

interface BaseDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DialogOverlay({ isOpen, onCancel, children }: { isOpen: boolean; onCancel: () => void; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl mx-4">
        {children}
      </div>
    </div>
  );
}

export function DeleteTemplateDialog({
  isOpen,
  onConfirm,
  onCancel,
  templateName = "Họp nhóm hàng tuần",
}: BaseDialogProps & { templateName?: string }) {
  return (
    <DialogOverlay isOpen={isOpen} onCancel={onCancel}>
      <button onClick={onCancel} className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-error/10 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-on-surface">Xóa mẫu lịch?</h3>
      </div>

      <p className="text-sm text-on-surface-variant mb-4">
        Mẫu <span className="font-bold text-on-surface">&quot;{templateName}&quot;</span> sẽ bị xóa vĩnh viễn.
        Bạn sẽ không thể tạo nhanh lịch từ mẫu này nữa.
      </p>

      {/* Preview */}
      <div className="bg-error/5 border border-error/10 rounded-xl p-4 mb-5">
        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          Xem trước mẫu
        </p>
        <div className="mt-2 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="h-2 bg-on-surface-variant/10 rounded w-24" />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 border border-outline-variant rounded-xl text-on-surface font-medium text-sm hover:bg-surface-container transition-colors"
        >
          Hủy
        </button>
        <button
          onClick={onConfirm}
          className="px-6 py-2.5 bg-error text-on-primary rounded-xl font-medium text-sm hover:bg-error/90 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          Xóa mẫu
        </button>
      </div>
    </DialogOverlay>
  );
}

export function DeleteTagDialog({
  isOpen,
  onConfirm,
  onCancel,
  tagName = "Quan trọng",
  affectedCount = 15,
}: BaseDialogProps & { tagName?: string; affectedCount?: number }) {
  return (
    <DialogOverlay isOpen={isOpen} onCancel={onCancel}>
      <button onClick={onCancel} className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-error/10 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-on-surface">Xóa thẻ phân loại?</h3>
      </div>

      <p className="text-sm text-on-surface-variant mb-2">
        Bạn đang thực hiện xóa thẻ <span className="font-bold text-on-surface">&quot;{tagName}&quot;</span>.
        Thẻ này sẽ bị gỡ bỏ khỏi {affectedCount} lịch trình hiện tại.
      </p>

      <p className="text-sm text-on-surface-variant/70 border-l-2 border-outline-variant pl-3 mb-4">
        Các lịch trình vẫn được giữ nguyên nhưng sẽ không còn nhãn này.
      </p>

      {/* Preview */}
      <div className="bg-surface-container rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Xem trước thay đổi</p>
          <span className="text-xs text-error font-medium">Sắp gỡ bỏ</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <div className="h-2 bg-on-surface-variant/10 rounded w-24" />
        </div>
        <div className="flex gap-2 mt-2">
          <span className="px-2 py-0.5 bg-surface-container-high rounded text-xs text-on-surface-variant">Dự án A</span>
          <span className="px-2 py-0.5 bg-error/10 text-error rounded text-xs font-medium line-through">{tagName}</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 border border-outline-variant rounded-xl text-on-surface font-medium text-sm hover:bg-surface-container transition-colors uppercase tracking-wide"
        >
          Hủy
        </button>
        <button
          onClick={onConfirm}
          className="px-6 py-2.5 bg-error text-on-primary rounded-xl font-medium text-sm hover:bg-error/90 transition-colors uppercase tracking-wide"
        >
          Xóa thẻ
        </button>
      </div>
    </DialogOverlay>
  );
}

export function StopSharingDialog({
  isOpen,
  onConfirm,
  onCancel,
  scheduleName = "Dự án Alpha",
  personName = "Nguyễn Văn A",
}: BaseDialogProps & { scheduleName?: string; personName?: string }) {
  return (
    <DialogOverlay isOpen={isOpen} onCancel={onCancel}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-error/10 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-on-surface">Dừng chia sẻ lịch?</h3>
      </div>

      <p className="text-sm text-on-surface-variant mb-4">
        Bạn có chắc chắn muốn dừng chia sẻ lịch <span className="font-bold text-on-surface">&quot;{scheduleName}&quot;</span> với{" "}
        <span className="font-bold text-on-surface">{personName}</span>? Người này sẽ không còn quyền xem hoặc chỉnh sửa lịch trình này ngay lập tức.
      </p>

      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-5 py-2.5 border border-outline-variant rounded-xl text-on-surface font-medium text-sm hover:bg-surface-container transition-colors"
        >
          Hủy
        </button>
        <button
          onClick={onConfirm}
          className="px-5 py-2.5 bg-error text-on-primary rounded-xl font-medium text-sm hover:bg-error/90 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          Dừng chia sẻ
        </button>
      </div>

      <div className="mt-4 pt-3 border-t border-outline-variant/50 flex items-center gap-2 text-xs text-on-surface-variant">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        Hành động bảo mật được xác thực
      </div>
    </DialogOverlay>
  );
}
