const features = [
  {
    icon: "calendar_month",
    title: "Quản lý sự kiện",
    description:
      "Giao diện trực quan giúp bạn tạo và sắp xếp các sự kiện quan trọng một cách khoa học.",
  },
  {
    icon: "notifications",
    title: "Nhắc việc tự động",
    description:
      "Thông báo thông minh đa nền tảng, đảm bảo bạn không bao giờ bỏ lỡ một deadline nào.",
  },
  {
    icon: "smart_toy",
    title: "Chatbot Mezon",
    description:
      "Tương tác trực tiếp bằng lệnh text để thêm lịch nhanh chóng ngay khi đang chat.",
  },
  {
    icon: "insights",
    title: "Thống kê tiến độ",
    description:
      "Biểu đồ phân tích hiệu suất làm việc giúp bạn đánh giá quá trình hoàn thành mục tiêu.",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="py-20 sm:py-24 lg:py-32 bg-lp-surface-container-lowest"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
        <div className="text-center mb-16 sm:mb-20">
          <h2
            id="features-heading"
            className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-lp-on-surface"
          >
            Tất cả công cụ quản lý lịch trình trong một hệ thống
          </h2>
          <p className="text-lp-on-surface-variant text-base max-w-2xl mx-auto">
            Tối ưu hiệu suất làm việc của bạn với sự kết hợp hoàn hảo giữa công
            nghệ Web Dashboard và Chatbot thông minh.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="glass-card p-6 sm:p-8 rounded-2xl hover:border-lp-primary/50 hover-lift group"
            >
              <div className="w-12 h-12 rounded-xl bg-lp-primary/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <span
                  className="material-symbols-outlined text-lp-primary text-[28px]"
                  aria-hidden="true"
                >
                  {feature.icon}
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-lp-on-surface">
                {feature.title}
              </h3>
              <p className="text-lp-on-surface-variant text-sm leading-relaxed">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
