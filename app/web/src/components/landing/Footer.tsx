export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="w-full py-16 sm:py-20 bg-lp-surface-container-lowest border-t border-lp-outline-variant/40">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
        <div className="col-span-1 md:col-span-2">
          <div className="text-xl font-bold text-lp-on-surface mb-4">
            Productivity Flow
          </div>
          <p className="text-lp-on-surface-variant text-sm max-w-xs mb-4 leading-relaxed">
            Hệ thống quản lý sự kiện và nhắc việc thông minh tích hợp chatbot
            hàng đầu dành cho cộng đồng Mezon.
          </p>
          <p className="text-lp-on-surface-variant text-xs opacity-70">
            © {year} Productivity Flow · Đề tài thực tập tốt nghiệp — ĐH Quy
            Nhơn.
          </p>
        </div>

        <nav className="space-y-3" aria-label="Sản phẩm">
          <h3 className="text-sm font-bold uppercase tracking-widest text-lp-on-surface opacity-60 mb-3">
            Sản phẩm
          </h3>
          <ul className="space-y-2">
            <li>
              <a
                className="text-lp-on-surface-variant hover:text-lp-primary transition-colors text-sm"
                href="#features"
              >
                Tính năng
              </a>
            </li>
            <li>
              <a
                className="text-lp-on-surface-variant hover:text-lp-primary transition-colors text-sm"
                href="#preview"
              >
                Chatbot Mezon
              </a>
            </li>
            <li>
              <a
                className="text-lp-on-surface-variant hover:text-lp-primary transition-colors text-sm"
                href="#"
              >
                API Docs
              </a>
            </li>
          </ul>
        </nav>

        <nav className="space-y-3" aria-label="Công ty">
          <h3 className="text-sm font-bold uppercase tracking-widest text-lp-on-surface opacity-60 mb-3">
            Công ty
          </h3>
          <ul className="space-y-2">
            <li>
              <a
                className="text-lp-on-surface-variant hover:text-lp-primary transition-colors text-sm"
                href="#"
              >
                Về chúng tôi
              </a>
            </li>
            <li>
              <a
                className="text-lp-on-surface-variant hover:text-lp-primary transition-colors text-sm"
                href="#"
              >
                Blog công nghệ
              </a>
            </li>
            <li>
              <a
                className="text-lp-on-surface-variant hover:text-lp-primary transition-colors text-sm"
                href="mailto:contact@example.com"
              >
                Liên hệ
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
