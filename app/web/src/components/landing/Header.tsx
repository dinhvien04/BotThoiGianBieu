"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "#features", label: "Tính năng" },
  { href: "#workflow", label: "Cách hoạt động" },
  { href: "#preview", label: "Giao diện" },
  { href: "#faq", label: "Hỏi đáp" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 md:h-[72px] z-50 bg-brand-charcoal/80 backdrop-blur-md border-b border-white/5">
      <div className="h-full flex items-center justify-between px-4 sm:px-6 md:px-margin-page">
        <Link href="/" className="flex items-center gap-2" aria-label="Trang chủ Productivity Flow">
          <svg
            className="w-7 h-7 md:w-8 md:h-8 text-brand-teal"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <span className="text-base md:text-title-sm text-brand-ivory tracking-tight font-semibold">
            Productivity Flow
          </span>
        </Link>

        <nav className="hidden md:flex gap-8" aria-label="Điều hướng chính">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-body-sm text-brand-ivory/70 hover:text-brand-teal transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/dang-nhap"
            className="text-body-sm font-semibold text-brand-ivory/70 px-4 py-2 hover:text-brand-teal transition-colors"
          >
            Đăng nhập
          </Link>
          <Link
            href="/dang-nhap"
            className="bg-brand-teal text-brand-charcoal text-body-sm font-bold px-6 py-2 rounded-lg hover:brightness-110 transition-all"
          >
            Bắt đầu
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden p-2 text-brand-ivory rounded-lg hover:bg-white/10"
          aria-label={open ? "Đóng menu" : "Mở menu"}
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          {open ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        id="mobile-nav"
        className={`md:hidden absolute left-0 right-0 top-full bg-brand-charcoal/95 backdrop-blur-md border-b border-white/5 transition-all duration-200 origin-top ${open ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0 pointer-events-none"
          }`}
      >
        <nav className="flex flex-col px-4 py-4 gap-1" aria-label="Điều hướng di động">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="px-3 py-3 rounded-lg text-brand-ivory/80 hover:bg-white/5 hover:text-brand-teal transition-colors"
            >
              {item.label}
            </a>
          ))}
          <div className="h-px bg-white/10 my-2" />
          <Link
            href="/dang-nhap"
            onClick={() => setOpen(false)}
            className="px-3 py-3 rounded-lg text-brand-ivory/80 hover:bg-white/5 hover:text-brand-teal transition-colors"
          >
            Đăng nhập
          </Link>
          <Link
            href="/dang-nhap"
            onClick={() => setOpen(false)}
            className="mt-1 bg-brand-teal text-brand-charcoal font-bold px-3 py-3 rounded-lg text-center hover:brightness-110 transition-all"
          >
            Bắt đầu
          </Link>
        </nav>
      </div>
    </header>
  );
}
