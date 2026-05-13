const features = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    ),
    title: "Đồng bộ 2 chiều thời gian thực",
    description:
      "Tạo sự kiện trên Dashboard, nhận thông báo trên Mezon và ngược lại. Dữ liệu của bạn luôn nhất quán trên mọi nền tảng.",
    color: "teal",
    colSpan: "md:col-span-8" as const,
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
    title: "Nhắc việc thông minh",
    description:
      "Hệ thống tự động phân tích độ ưu tiên và nhắc nhở bạn vào đúng thời điểm thông qua Bot Mezon.",
    color: "teal",
    colSpan: "md:col-span-4" as const,
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
      </svg>
    ),
    title: "Quản lý Tag & Template",
    description:
      "Tiết kiệm thời gian với các mẫu công việc sẵn có và phân loại khoa học bằng hệ thống nhãn màu sắc.",
    color: "orange",
    colSpan: "md:col-span-4" as const,
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "Bảo mật cấp doanh nghiệp",
    description:
      "Dữ liệu của bạn được mã hóa đầu cuối và lưu trữ tại hệ thống máy chủ an toàn nhất.",
    color: "teal",
    colSpan: "md:col-span-8" as const,
  },
];

export default function Features() {
  return (
    <section className="py-[120px] px-margin-page max-w-7xl mx-auto" id="features">
      <div className="text-center mb-20">
        <h2 className="text-headline-md mb-4">Tính năng vượt trội</h2>
        <p className="text-body-sm text-white/50">
          Mọi công cụ bạn cần để duy trì nhịp độ công việc ổn định.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className={`${feature.colSpan} glass-card rounded-3xl p-10 flex flex-col justify-between ${
              feature.color === "orange"
                ? "bg-gradient-to-tr from-brand-orange/5 to-transparent"
                : index === 1
                ? "bg-gradient-to-br from-brand-teal/10 to-transparent"
                : ""
            }`}
          >
            <div>
              <div
                className={`mb-4 ${
                  feature.color === "orange"
                    ? "text-brand-orange"
                    : "text-brand-teal"
                }`}
              >
                {feature.icon}
              </div>
              <h3 className="text-title-sm mb-4">{feature.title}</h3>
              <p className="text-body-sm text-white/60">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
