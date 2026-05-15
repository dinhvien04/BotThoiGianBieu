const steps = [
  {
    number: "01",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Kết nối tài khoản",
    description: "Đăng ký tài khoản Productivity Flow và liên kết với ứng dụng Mezon của bạn.",
  },
  {
    number: "02",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
      </svg>
    ),
    title: "Tạo lịch trình",
    description: "Sử dụng giao diện kéo thả mượt mà trên Dashboard để lên kế hoạch cho ngày mới.",
  },
  {
    number: "03",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: "Theo dõi mọi nơi",
    description: "Nhận báo cáo hiệu suất và lời nhắc trực tiếp qua Mezon dù bạn đang ở bất cứ đâu.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="workflow"
      aria-labelledby="workflow-heading"
      className="py-16 sm:py-20 md:py-[120px] bg-white/[0.02]"
    >
      <div className="px-4 sm:px-6 md:px-margin-page max-w-7xl mx-auto">
        <div className="text-center mb-12 sm:mb-16 md:mb-20">
          <h2 id="workflow-heading" className="text-2xl sm:text-3xl md:text-headline-md mb-3 sm:mb-4">
            Quy trình đơn giản
          </h2>
          <p className="text-body-sm text-white/50">
            Bắt đầu tối ưu hiệu suất chỉ trong vài phút.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 md:gap-12 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-24 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {steps.map((step) => (
            <div key={step.number} className="relative text-center group">
              <div className="w-20 h-20 bg-brand-charcoal border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-8 relative z-10 group-hover:border-brand-teal transition-colors">
                <span className="text-display-lg text-white/10 absolute -top-8 -left-4 pointer-events-none select-none">
                  {step.number}
                </span>
                <span className="text-brand-teal">{step.icon}</span>
              </div>
              <h4 className="text-title-sm mb-4">{step.title}</h4>
              <p className="text-body-sm text-white/50 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
