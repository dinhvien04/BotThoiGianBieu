const steps = [
  {
    number: "01",
    title: "Tạo sự kiện",
    description:
      "Thêm lịch qua Dashboard hoặc gõ lệnh trực tiếp cho Chatbot Mezon.",
  },
  {
    number: "02",
    title: "Hệ thống theo dõi",
    description:
      "Dữ liệu được đồng bộ hóa và phân tích độ ưu tiên một cách tự động.",
  },
  {
    number: "03",
    title: "Tự động nhắc việc",
    description:
      "Nhận thông báo nhắc nhở 15 phút trước khi sự kiện bắt đầu qua Mezon.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="workflow"
      aria-labelledby="workflow-heading"
      className="py-20 sm:py-24 lg:py-32"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
        <h2
          id="workflow-heading"
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-16 sm:mb-20 text-lp-on-surface"
        >
          Quy trình vận hành tối ưu
        </h2>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
          {/* Connecting line (desktop) */}
          <div
            className="hidden md:block absolute top-12 left-0 w-full h-[2px] bg-gradient-to-r from-lp-primary/10 via-lp-primary/40 to-lp-primary/10 -z-10"
            aria-hidden="true"
          />

          {steps.map((step) => (
            <div
              key={step.number}
              className="flex flex-col items-center text-center space-y-5 group"
            >
              <div className="w-24 h-24 rounded-full bg-lp-surface-container flex items-center justify-center border-4 border-lp-bg ring-4 ring-lp-primary/20 z-10 transition-all duration-300 group-hover:ring-lp-primary/50 group-hover:scale-110 group-hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.5)]">
                <span className="text-4xl font-extrabold text-lp-primary">
                  {step.number}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-lp-on-surface">
                  {step.title}
                </h3>
                <p className="text-lp-on-surface-variant text-sm leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
