export default function Footer() {
  return (
    <footer className="py-10 sm:py-12 px-4 sm:px-6 md:px-margin-page border-t border-white/5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8 text-center md:text-left">
        <div className="flex items-center gap-2">
          <svg
            className="w-6 h-6 text-brand-teal"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <span className="text-title-sm text-brand-ivory">
            Productivity Flow
          </span>
        </div>

        <nav aria-label="Liên kết chân trang" className="flex flex-wrap justify-center gap-x-6 gap-y-2 sm:gap-8">
          <a
            className="text-body-sm text-white/40 hover:text-brand-ivory transition-colors"
            href="#"
          >
            Chính sách bảo mật
          </a>
          <a
            className="text-body-sm text-white/40 hover:text-brand-ivory transition-colors"
            href="#"
          >
            Điều khoản dịch vụ
          </a>
          <a
            className="text-body-sm text-white/40 hover:text-brand-ivory transition-colors"
            href="#"
          >
            Cộng đồng
          </a>
        </nav>

        <div className="flex gap-3 sm:gap-4">
          <a
            aria-label="Chia sẻ"
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-teal/20 transition-all"
            href="#"
          >
            <svg
              className="w-5 h-5 text-white/60"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
              />
            </svg>
          </a>
          <a
            aria-label="Liên hệ qua email"
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-teal/20 transition-all"
            href="mailto:contact@example.com"
          >
            <svg
              className="w-5 h-5 text-white/60"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
          </a>
        </div>
      </div>
      <div className="mt-6 sm:mt-8 text-center text-[11px] sm:text-[12px] text-white/20 uppercase tracking-widest px-4">
        © {new Date().getFullYear()} Productivity Flow — Đề tài thực tập tốt nghiệp · ĐH Quy Nhơn.
      </div>
    </footer>
  );
}
