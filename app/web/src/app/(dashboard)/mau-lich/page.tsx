"use client";

import { mockTemplates, typeLabels, priorityLabels, priorityColors } from "@/lib/mock-data";

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Mẫu lịch của tôi</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Tối ưu hóa quy trình làm việc với các mẫu sự kiện có sẵn.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Tạo template mới
        </button>
      </div>

      {/* Template Cards */}
      <div className="grid grid-cols-3 gap-6">
        {mockTemplates.map((template) => (
          <div key={template.id} className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container-high hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs px-2 py-0.5 rounded-full font-bold text-on-primary bg-primary">
                {typeLabels[template.type] || template.type}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-bold text-on-primary"
                style={{ backgroundColor: priorityColors[template.priority] }}
              >
                {priorityLabels[template.priority]}
              </span>
            </div>
            <h3 className="text-lg font-bold text-on-surface">{template.title}</h3>
            <p className="text-sm text-on-surface-variant mt-1 italic">&ldquo;{template.description}&rdquo;</p>

            <div className="mt-4 space-y-1.5 text-sm text-on-surface-variant">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Thời lượng: {template.duration} phút
              </div>
              {template.reminder && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  Nhắc nhở: Trước {template.reminder >= 1440 ? `${template.reminder / 1440} ngày` : `${template.reminder} phút`}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-5">
              <button className="flex-1 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                Dùng ngay
              </button>
              <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </button>
              <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.5a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                </svg>
              </button>
              <button className="p-2 text-error/60 hover:bg-error/5 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        {/* Add New Template Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border-2 border-dashed border-outline-variant flex flex-col items-center justify-center min-h-[240px] hover:border-primary/50 transition-colors cursor-pointer group">
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-3 group-hover:bg-primary/10">
            <svg className="w-6 h-6 text-on-surface-variant group-hover:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <p className="font-semibold text-on-surface">Thêm mẫu mới</p>
          <p className="text-xs text-on-surface-variant mt-1 text-center">
            Lưu trữ các cài đặt sự kiện thường dùng
          </p>
        </div>
      </div>

      {/* Tips Section */}
      <div className="bg-surface-container-low rounded-2xl p-6">
        <h3 className="font-bold text-on-surface mb-4">Làm việc thông minh hơn với Mẫu</h3>
        <div className="space-y-3">
          {[
            { title: "Tiết kiệm thời gian:", text: "Không cần nhập lại các thông tin lặp đi lặp lại hàng ngày." },
            { title: "Chuẩn hóa quy trình:", text: "Đảm bảo mọi cuộc họp team đều có thời lượng và nhắc nhở đúng chuẩn." },
            { title: "Đồng bộ nhanh:", text: "Một click để thêm vào lịch cá nhân hoặc chia sẻ cho đồng nghiệp." },
          ].map((tip, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <svg className="w-5 h-5 text-[#27AE60] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-on-surface">
                <span className="font-semibold">{tip.title}</span> {tip.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
