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
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="py-16 sm:py-20 md:py-[120px] px-4 sm:px-6 md:px-margin-page max-w-3xl mx-auto"
    >
      <div className="text-center mb-12 sm:mb-16 md:mb-20">
        <h2 id="faq-heading" className="text-2xl sm:text-3xl md:text-headline-md mb-3 sm:mb-4">
          Câu hỏi thường gặp
        </h2>
        <p className="text-body-sm text-white/50">
          Mọi thứ bạn cần biết trước khi bắt đầu.
        </p>
      </div>

      <div className="space-y-3 sm:space-y-4" itemScope itemType="https://schema.org/FAQPage">
        {faqs.map((faq, index) => (
          <article
            key={index}
            className="glass-card rounded-2xl overflow-hidden transition-all"
            itemProp="mainEntity"
            itemScope
            itemType="https://schema.org/Question"
          >
            <button
              type="button"
              className="w-full px-5 sm:px-8 py-4 sm:py-6 flex items-center justify-between text-left gap-3"
              onClick={() => setOpen(open === index ? null : index)}
              aria-expanded={open === index}
              aria-controls={`faq-panel-${index}`}
            >
              <span className="text-base sm:text-title-sm font-semibold" itemProp="name">
                {faq.question}
              </span>
              <svg
                className={`w-5 h-5 text-brand-teal flex-shrink-0 transition-transform ${open === index ? "rotate-180" : ""
                  }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
              id={`faq-panel-${index}`}
              role="region"
              itemScope
              itemProp="acceptedAnswer"
              itemType="https://schema.org/Answer"
              className={`overflow-hidden transition-all duration-300 ${open === index ? "max-h-60 pb-4 sm:pb-6" : "max-h-0"
                }`}
            >
              <p className="px-5 sm:px-8 text-sm sm:text-body-sm text-white/60 leading-relaxed" itemProp="text">
                {faq.answer}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
