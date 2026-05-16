"use client";

import Link from "next/link";
import { useState } from "react";
import ThemeToggle from "@/components/landing/ThemeToggle";

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="h-topbar-height bg-surface border-b border-outline-variant px-3 sm:px-4 md:px-6 sticky top-0 z-20">
      <div className="h-full flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-xl min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Mở menu"
            className="lg:hidden p-2 -ml-1 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {/* Desktop search */}
          <form role="search" className="hidden sm:flex items-center gap-2 flex-1 min-w-0">
            <label htmlFor="topbar-search" className="sr-only">
              Tìm kiếm công việc, sự kiện
            </label>
            <svg className="w-5 h-5 text-on-surface-variant flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              id="topbar-search"
              type="search"
              placeholder="Tìm kiếm công việc, sự kiện..."
              className="w-full bg-surface-container-low rounded-lg px-4 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </form>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
          {/* Mobile search toggle */}
          <button
            type="button"
            onClick={() => setMobileSearchOpen((v) => !v)}
            aria-label="Tìm kiếm"
            aria-expanded={mobileSearchOpen}
            className="sm:hidden p-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>

          <ThemeToggle className="!w-9 !h-9 !border-outline-variant" />

          <Link
            href="/thong-bao"
            aria-label="Thông báo"
            className="relative p-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" aria-hidden="true" />
          </Link>

          <Link
            href="/tro-giup"
            aria-label="Trợ giúp"
            className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors hidden md:block"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          </Link>

          <Link
            href="/ho-so"
            aria-label="Hồ sơ cá nhân"
            className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-on-primary text-sm font-bold flex-shrink-0"
          >
            Q
          </Link>
        </div>
      </div>

      {/* Mobile expandable search */}
      {mobileSearchOpen && (
        <form role="search" className="sm:hidden absolute left-0 right-0 top-full bg-surface border-b border-outline-variant px-3 py-3 flex items-center gap-2 shadow-sm">
          <label htmlFor="topbar-search-mobile" className="sr-only">
            Tìm kiếm công việc, sự kiện
          </label>
          <svg className="w-5 h-5 text-on-surface-variant flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            id="topbar-search-mobile"
            type="search"
            autoFocus
            placeholder="Tìm kiếm công việc, sự kiện..."
            className="w-full bg-surface-container-low rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </form>
      )}
    </header>
  );
}
