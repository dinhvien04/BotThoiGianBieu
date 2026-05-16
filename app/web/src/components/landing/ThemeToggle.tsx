"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTheme(getInitialTheme());
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    try {
      localStorage.setItem("theme", next);
    } catch { }
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
      title={isDark ? "Chế độ sáng" : "Chế độ tối"}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full border border-black/10 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition-all ${className}`}
    >
      <span
        className="material-symbols-outlined text-[20px]"
        aria-hidden="true"
        suppressHydrationWarning
      >
        {mounted ? (isDark ? "light_mode" : "dark_mode") : "dark_mode"}
      </span>
    </button>
  );
}
