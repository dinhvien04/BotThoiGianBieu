"use client";

import { useState } from "react";

const faqs = [
  {
    question: "Productivity Flow có miễn phí không?",
    answer:
      "Có! Chúng tôi cung cấp gói miễn phí với đầy đủ tính năng cơ bản bao gồm quản lý lịch, nhắc nhở, đồng bộ cơ bản và hỗ trợ Bot Mezon. Các gói nâng cao sẽ bổ sung thêm báo cáo phân tích, template nâng cao và ưu tiên hỗ trợ.",
  },
  {
    question: "Làm thế nào để kết nối với Bot Mezon?",
    answer:
      "Sau khi đăng ký tài khoản, vào mục Cài đặt > Mezon Integration và nhấn nút 'Kết nối'. Bạn sẽ được hướng dẫn thêm Bot vào kênh Mezon của mình chỉ trong 2 bước đơn giản.",
  },
  {
    question: "Dữ liệu của tôi có an toàn không?",
    answer:
      "Tuyệt đối! Chúng tôi sử dụng mã hóa đầu cuối cho tất cả dữ liệu. Máy chủ được đặt tại cơ sở hạ tầng đạt chuẩn ISO 27001. Bạn có toàn quyền kiểm soát và có thể xuất/xóa dữ liệu bất cứ lúc nào.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-[120px] px-margin-page max-w-3xl mx-auto" id="faq">
      <div className="text-center mb-20">
        <h2 className="text-headline-md mb-4">Câu hỏi thường gặp</h2>
        <p className="text-body-sm text-white/50">
          Mọi thứ bạn cần biết trước khi bắt đầu.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="glass-card rounded-2xl overflow-hidden transition-all"
          >
            <button
              className="w-full px-8 py-6 flex items-center justify-between text-left"
              onClick={() => setOpen(open === index ? null : index)}
            >
              <span className="text-title-sm">{faq.question}</span>
              <svg
                className={`w-5 h-5 text-brand-teal flex-shrink-0 ml-4 transition-transform ${
                  open === index ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ${
                open === index ? "max-h-40 pb-6" : "max-h-0"
              }`}
            >
              <p className="px-8 text-body-sm text-white/50 leading-relaxed">
                {faq.answer}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
