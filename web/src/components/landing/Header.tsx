import Link from "next/link";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 h-[72px] z-50 bg-brand-charcoal/80 backdrop-blur-md flex items-center justify-between px-margin-page border-b border-white/5">
      <div className="flex items-center gap-2">
        <svg
          className="w-8 h-8 text-brand-teal"
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
        <span className="text-title-sm text-brand-ivory tracking-tight">
          Productivity Flow
        </span>
      </div>

      <nav className="hidden md:flex gap-8">
        <a
          className="text-body-sm text-brand-ivory/70 hover:text-brand-teal transition-colors"
          href="#features"
        >
          Tính năng
        </a>
        <a
          className="text-body-sm text-brand-ivory/70 hover:text-brand-teal transition-colors"
          href="#workflow"
        >
          Cách hoạt động
        </a>
        <a
          className="text-body-sm text-brand-ivory/70 hover:text-brand-teal transition-colors"
          href="#preview"
        >
          Giao diện
        </a>
        <a
          className="text-body-sm text-brand-ivory/70 hover:text-brand-teal transition-colors"
          href="#faq"
        >
          Hỏi đáp
        </a>
      </nav>

      <div className="flex items-center gap-4">
        <Link
          href="/dang-nhap"
          className="text-body-sm font-semibold text-brand-ivory/70 px-4 py-2 hover:text-brand-teal transition-colors"
        >
          Đăng nhập
        </Link>
        <Link
          href="/dang-ky"
          className="bg-brand-teal text-brand-charcoal text-body-sm font-bold px-6 py-2 rounded-lg hover:brightness-110 transition-all"
        >
          Bắt đầu
        </Link>
      </div>
    </header>
  );
}
