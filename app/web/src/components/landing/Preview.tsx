const checkItems = [
  "Chế độ xem Ngày/Tuần/Tháng linh hoạt",
  "Kéo thả để thay đổi thời gian công việc",
  "Phân loại theo dự án với nhãn màu sắc",
];

export default function Preview() {
  return (
    <section
      id="preview"
      aria-labelledby="preview-heading"
      className="py-16 sm:py-20 md:py-[120px] px-4 sm:px-6 md:px-margin-page overflow-hidden"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-20 items-center">
          <div>
            <h2 id="preview-heading" className="text-2xl sm:text-3xl md:text-headline-md mb-4 sm:mb-6">
              Giao diện Dashboard chuyên nghiệp
            </h2>
            <p className="text-base sm:text-body-md text-white/60 mb-6 sm:mb-8 leading-relaxed">
              Được thiết kế tối giản để loại bỏ mọi sự xao nhãng. Chúng tôi ưu
              tiên không gian hiển thị cho các sự kiện quan trọng và danh sách
              công việc của bạn.
            </p>
            <ul className="space-y-4">
              {checkItems.map((item, index) => (
                <li key={index} className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-brand-teal flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-body-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-brand-teal/20 blur-3xl rounded-full" />
            <div className="relative glass-card rounded-2xl p-4 border border-white/20">
              {/* Dashboard preview mockup */}
              <div className="w-full rounded-lg bg-brand-charcoal border border-white/10 p-6 space-y-4">
                {/* Header bar */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                  <div className="h-3 w-32 bg-white/10 rounded" />
                  <div className="w-6" />
                </div>

                {/* Content area */}
                <div className="flex gap-4">
                  {/* Sidebar */}
                  <div className="w-16 space-y-3 hidden sm:block">
                    <div className="h-3 bg-brand-teal/30 rounded" />
                    <div className="h-3 bg-white/10 rounded" />
                    <div className="h-3 bg-white/10 rounded" />
                    <div className="h-3 bg-white/10 rounded" />
                  </div>

                  {/* Calendar grid */}
                  <div className="flex-1 grid grid-cols-7 gap-1">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div key={`header-${i}`} className="h-2 bg-white/5 rounded" />
                    ))}
                    {Array.from({ length: 35 }).map((_, i) => (
                      <div
                        key={`cell-${i}`}
                        className={`h-8 rounded ${i === 10
                            ? "bg-brand-teal/30 border border-brand-teal/50"
                            : i === 15
                              ? "bg-brand-orange/20 border border-brand-orange/40"
                              : i === 22
                                ? "bg-primary/20 border border-primary/40"
                                : "bg-white/5"
                          }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
