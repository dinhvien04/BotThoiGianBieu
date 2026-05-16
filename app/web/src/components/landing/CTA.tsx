import Link from "next/link";

export default function CTA() {
  return (
    <section
      aria-labelledby="cta-heading"
      className="py-20 sm:py-24 lg:py-32"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-16 text-center">
        <div className="glass-card p-8 sm:p-12 lg:p-16 rounded-[2rem] border border-lp-primary/20 relative overflow-hidden">
          {/* Glow effects */}
          <div
            className="absolute -top-24 -right-24 w-64 h-64 bg-lp-primary/20 blur-[100px] rounded-full pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-24 -left-24 w-64 h-64 bg-lp-tertiary/10 blur-[100px] rounded-full pointer-events-none"
            aria-hidden="true"
          />

          <h2
            id="cta-heading"
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-6 relative z-10 text-lp-on-surface"
          >
            Biến Mezon thành trợ lý quản lý công việc của bạn
          </h2>
          <p className="text-base sm:text-lg text-lp-on-surface-variant mb-10 max-w-2xl mx-auto relative z-10">
            Gia nhập cùng 500+ đội ngũ đang tối ưu hóa hiệu suất làm việc mỗi ngày.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
            <Link
              href="/dang-nhap"
              className="bg-lp-primary-container text-lp-on-primary-container font-semibold px-8 sm:px-10 py-4 rounded-2xl shadow-xl hover:scale-105 transition-transform flex items-center justify-center gap-2"
            >
              Vào Dashboard
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
            <button
              type="button"
              className="bg-lp-surface border border-lp-outline-variant text-lp-on-surface font-semibold px-8 sm:px-10 py-4 rounded-2xl hover:bg-lp-surface-container-low transition-all flex items-center justify-center gap-2"
            >
              Kết nối Mezon
              <span className="material-symbols-outlined" aria-hidden="true">
                link
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
