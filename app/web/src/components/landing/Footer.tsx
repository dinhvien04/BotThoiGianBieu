"use client";

import { useLandingLanguage } from "./LanguageContext";

export default function Footer() {
  const year = new Date().getFullYear();
  const { t } = useLandingLanguage();

  return (
    <footer className="w-full py-16 sm:py-20 bg-lp-surface-container-lowest border-t border-lp-outline-variant/40">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
        <div className="col-span-1 md:col-span-2">
          <div className="text-xl font-extrabold bg-gradient-to-r from-lp-primary to-lp-primary-container bg-clip-text text-transparent mb-4">
            Productivity Flow
          </div>
          <p className="text-lp-on-surface-variant text-sm max-w-xs mb-4 leading-relaxed">
            {t("footer.desc")}
          </p>
          <p className="text-lp-on-surface-variant text-xs opacity-70">
            © {year} Productivity Flow · {t("footer.copyright")}
          </p>
        </div>

        <nav className="space-y-3" aria-label={t("footer.product")}>
          <h3 className="text-sm font-bold uppercase tracking-widest text-lp-on-surface opacity-60 mb-3">
            {t("footer.product")}
          </h3>
          <ul className="space-y-2">
            <li>
              <a
                className="text-lp-on-surface-variant hover:text-lp-primary transition-colors text-sm"
                href="#features"
              >
                {t("footer.features")}
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

        <nav className="space-y-3" aria-label={t("footer.company")}>
          <h3 className="text-sm font-bold uppercase tracking-widest text-lp-on-surface opacity-60 mb-3">
            {t("footer.company")}
          </h3>
          <ul className="space-y-2">
            <li>
              <a
                className="text-lp-on-surface-variant hover:text-lp-primary transition-colors text-sm"
                href="#"
              >
                {t("footer.about")}
              </a>
            </li>
            <li>
              <a
                className="text-lp-on-surface-variant hover:text-lp-primary transition-colors text-sm"
                href="#"
              >
                {t("footer.blog")}
              </a>
            </li>
            <li>
              <a
                className="text-lp-on-surface-variant hover:text-lp-primary transition-colors text-sm"
                href="mailto:contact@example.com"
              >
                {t("footer.contact")}
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
