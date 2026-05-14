"use client";

import Link from "next/link";

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="h-topbar-height bg-white border-b border-outline-variant flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-1 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <svg className="w-5 h-5 text-on-surface-variant hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          placeholder="Tìm kiếm công việc, sự kiện..."
          className="w-full bg-surface-container-low rounded-lg px-4 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 hidden sm:block"
        />
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <Link
          href="/thong-bao"
          className="relative p-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
        </Link>

        <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors hidden md:block">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        </button>

        <Link href="/ho-so" className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
          Q
        </Link>
      </div>
    </header>
  );
}
