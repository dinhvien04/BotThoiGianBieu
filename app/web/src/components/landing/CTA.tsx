import Link from "next/link";

export default function CTA() {
  return (
    <section
      aria-labelledby="cta-heading"
      className="py-16 sm:py-20 md:py-[100px] px-4 sm:px-6 md:px-margin-page text-center"
    >
      <div className="max-w-4xl mx-auto glass-card rounded-3xl sm:rounded-[40px] p-8 sm:p-12 md:p-16 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-brand-teal to-transparent" />

        <h2 id="cta-heading" className="text-2xl sm:text-3xl md:text-[36px] font-extrabold mb-4 sm:mb-6">
          Sẵn sàng tối ưu hiệu suất?
        </h2>
        <p className="text-base sm:text-body-md text-white/60 mb-8 sm:mb-10">
          Bắt đầu hành trình chinh phục thời gian của bạn ngay hôm nay cùng hơn
          50,000 người dùng khác.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Link
            href="/dang-nhap"
            className="bg-brand-teal text-brand-charcoal px-8 sm:px-12 py-3 sm:py-4 rounded-xl font-bold text-body-md hover:brightness-110 transition-all"
          >
            Bắt đầu miễn phí
          </Link>
          <button
            type="button"
            className="bg-white/5 border border-white/10 text-white px-8 sm:px-12 py-3 sm:py-4 rounded-xl font-bold text-body-md hover:bg-white/10 transition-all"
          >
            Liên hệ hỗ trợ
          </button>
        </div>
      </div>
    </section>
  );
}
