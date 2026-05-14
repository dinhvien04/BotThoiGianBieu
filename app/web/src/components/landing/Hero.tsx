import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative pt-[160px] pb-[100px] px-margin-page hero-gradient min-h-[870px] flex flex-col items-center justify-center text-center">
      <div className="max-w-4xl mx-auto">
        <span className="inline-block py-1 px-3 mb-6 bg-brand-teal/10 text-brand-teal text-label-bold rounded-full border border-brand-teal/20">
          Phiên bản 2.0 đã ra mắt
        </span>

        <h1 className="text-display-lg mb-8 bg-clip-text text-transparent bg-gradient-to-r from-brand-ivory to-white/70">
          Làm chủ thời gian,
          <br />
          tối ưu hiệu suất
        </h1>

        <p className="text-body-md text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed">
          Giải pháp quản lý lịch trình chuyên nghiệp đồng bộ giữa Web Dashboard
          và Bot Mezon. Giúp bạn tập trung vào công việc quan trọng nhất mà
          không bao giờ bỏ lỡ deadline.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dang-ky"
            className="bg-brand-teal text-brand-charcoal px-10 py-4 rounded-xl font-bold text-body-md hover:scale-105 transition-transform inline-flex items-center gap-2 justify-center"
          >
            Dùng thử ngay
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
          <button className="border border-brand-orange text-brand-orange px-10 py-4 rounded-xl font-bold text-body-md hover:bg-brand-orange/10 transition-all inline-flex items-center gap-2 justify-center">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            Kết nối Mezon
          </button>
        </div>
      </div>

      {/* Decoration */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-64 h-64 bg-brand-teal/10 blur-[100px] rounded-full" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-orange/5 blur-[120px] rounded-full" />
    </section>
  );
}
