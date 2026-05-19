"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLandingLanguage } from "./LanguageContext";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "#features", labelKey: "header.features" },
  { href: "#workflow", labelKey: "header.workflow" },
  { href: "#preview", labelKey: "header.preview" },
  { href: "#faq", labelKey: "header.faq" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const { language, setLanguage, t } = useLandingLanguage();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <nav className="sticky top-0 w-full z-50 bg-lp-surface/60 backdrop-blur-2xl border-b border-lp-outline-variant/30">
      <div className="flex justify-between items-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 py-4">
        <Link
          href="/"
          aria-label={t("header.home")}
          className="font-extrabold text-lg sm:text-xl bg-gradient-to-r from-lp-primary to-lp-primary-container bg-clip-text text-transparent"
        >
          Productivity Flow
        </Link>

        <div className="hidden md:flex gap-1 items-center" role="navigation">
          {NAV_ITEMS.map((item, idx) => (
            <a
              key={item.href}
              href={item.href}
              className={`text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${idx === 0
                ? "text-lp-primary bg-lp-primary/10"
                : "text-lp-on-surface-variant hover:text-lp-on-surface hover:bg-lp-surface-container-high/50"
                }`}
            >
              {t(item.labelKey)}
            </a>
          ))}
        </div>

        <div className="flex gap-2 sm:gap-3 items-center">
          <ThemeToggle
            labels={{
              toLight: t("theme.toLight"),
              toDark: t("theme.toDark"),
              light: t("theme.light"),
              dark: t("theme.dark"),
            }}
          />
          <div
            className="inline-flex h-10 items-center rounded-full border border-black/10 dark:border-white/15 bg-lp-surface/70 p-1"
            aria-label={t("language.label")}
            role="group"
          >
            {(["vi", "en"] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLanguage(code)}
                aria-pressed={language === code}
                className={`h-8 min-w-9 rounded-full px-2 text-xs font-bold transition-all ${language === code
                  ? "bg-lp-primary text-lp-on-primary shadow-sm"
                  : "text-lp-on-surface-variant hover:text-lp-on-surface"
                  }`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          <Link
            href="/dang-nhap"
            className="hidden sm:inline-block text-lp-on-surface-variant hover:text-lp-on-surface text-sm font-medium px-4 py-2 transition-all"
          >
            {t("header.login")}
          </Link>
          <Link
            href="/dang-nhap"
            className="hidden sm:inline-flex bg-lp-primary text-lp-on-primary text-sm font-bold px-6 py-2.5 rounded-full shadow-lg shadow-lp-primary/20 hover:shadow-lp-primary/30 active:scale-95 transition-all"
          >
            {t("header.start")}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden p-2 text-lp-on-surface rounded-lg hover:bg-lp-surface-container-high"
            aria-label={open ? t("header.closeMenu") : t("header.openMenu")}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">
              {open ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        className={`md:hidden absolute left-0 right-0 top-full bg-lp-surface/95 backdrop-blur-xl border-b border-lp-outline-variant/50 transition-all duration-200 origin-top ${open ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0 pointer-events-none"
          }`}
      >
        <nav
          className="flex flex-col px-4 py-4 gap-1"
          aria-label={t("header.mobileNav")}
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="px-3 py-3 rounded-lg text-lp-on-surface-variant hover:bg-lp-surface-container-high hover:text-lp-primary transition-colors text-sm font-medium"
            >
              {t(item.labelKey)}
            </a>
          ))}
          <div className="h-px bg-lp-outline-variant/50 my-2" />
          <Link
            href="/dang-nhap"
            onClick={() => setOpen(false)}
            className="px-3 py-3 rounded-lg text-lp-on-surface-variant hover:bg-lp-surface-container-high hover:text-lp-primary transition-colors text-sm font-medium"
          >
            {t("header.login")}
          </Link>
          <Link
            href="/dang-nhap"
            onClick={() => setOpen(false)}
            className="px-3 py-3 rounded-lg bg-lp-primary text-lp-on-primary transition-colors text-sm font-bold"
          >
            {t("header.start")}
          </Link>
        </nav>
      </div>
    </nav>
  );
}
