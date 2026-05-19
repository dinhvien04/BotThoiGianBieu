"use client";

import { useCallback, useEffect, useState } from "react";

type Language = "vi" | "en";

const viToEn: Record<string, string> = {
  "Trang chủ": "Home",
  "Trang chủ Productivity Flow": "Productivity Flow home",
  "← Trang chủ": "← Home",
  "Hệ thống quản lý sự kiện & nhắc việc trên Mezon": "Event and reminder management on Mezon",
  "Quản lý lịch trình": "Schedule management",
  "thông minh & hiệu quả": "smart and efficient",
  "Đồng bộ giữa Web Dashboard và Bot Mezon. Tạo, quản lý và theo dõi lịch trình của bạn mọi lúc, mọi nơi.": "Sync the Web Dashboard with Mezon Bot. Create, manage, and track your schedules anytime, anywhere.",
  "Người dùng": "Users",
  "Sự kiện/ngày": "Events/day",
  "Đăng nhập bằng Mezon": "Sign in with Mezon",
  "Sử dụng tài khoản Mezon để vào dashboard quản lý lịch trình.": "Use your Mezon account to access the schedule management dashboard.",
  "Tiếp tục với Mezon": "Continue with Mezon",
  "Chỉ hỗ trợ đăng nhập Mezon": "Mezon sign-in only",
  "Tài khoản sẽ được tạo tự động trong lần đăng nhập Mezon đầu tiên.": "Your account will be created automatically the first time you sign in with Mezon.",
  "Không thể hoàn tất đăng nhập Mezon. Vui lòng thử lại.": "Could not complete Mezon sign-in. Please try again.",
  "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại bằng Mezon.": "Invalid sign-in session. Please sign in with Mezon again.",
  "Kết nối Mezon": "Connect Mezon",
  "Đăng nhập bằng Mezon để liên kết tài khoản và sử dụng dashboard.": "Sign in with Mezon to link your account and use the dashboard.",
  "Nhắc nhở tự động": "Automatic reminders",
  "Nhận thông báo trước sự kiện qua Mezon chat": "Receive notifications before events through Mezon chat",
  "Quản lý bằng lệnh": "Command-based management",
  "Dùng lệnh bot ngay trong kênh Mezon của bạn": "Use bot commands directly in your Mezon channel",
  "Đồng bộ dữ liệu": "Data sync",
  "Web dashboard và bot dùng chung tài khoản Mezon": "The web dashboard and bot share the same Mezon account",
};

const enToVi = Object.fromEntries(
  Object.entries(viToEn).map(([vi, en]) => [en, vi]),
) as Record<string, string>;

function readStoredLanguage(): Language {
  const stored = localStorage.getItem("language");
  if (stored === "vi" || stored === "en") return stored;
  return navigator.language.toLowerCase().startsWith("en") ? "en" : "vi";
}

function translateText(text: string, language: Language): string {
  const trimmed = text.trim();
  if (!trimmed) return text;
  const dictionary = language === "en" ? viToEn : enToVi;
  const exact = dictionary[trimmed];
  if (exact) return text.replace(trimmed, exact);

  const entries = Object.entries(dictionary)
    .filter(([from]) => from.length >= 4 && trimmed.includes(from))
    .sort((a, b) => b[0].length - a[0].length);
  if (entries.length === 0) return text;

  let translated = text;
  for (const [from, to] of entries) {
    translated = translated.split(from).join(to);
  }
  return translated;
}

function translateAuthDom(language: Language): void {
  const root = document.querySelector("[data-auth-shell]");
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return node.textContent?.trim()
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  textNodes.forEach((node) => {
    const next = translateText(node.textContent ?? "", language);
    if (next !== node.textContent) node.textContent = next;
  });

  root.querySelectorAll<HTMLElement>("[aria-label], [title]").forEach((el) => {
    for (const attr of ["aria-label", "title"]) {
      const value = el.getAttribute(attr);
      if (!value) continue;
      const next = translateText(value, language);
      if (next !== value) el.setAttribute(attr, next);
    }
  });
}

export default function AuthLanguageShell({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("vi");

  useEffect(() => {
    setLanguageState(readStoredLanguage());
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    localStorage.setItem("language", next);
    document.documentElement.lang = next;
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;

    let raf = 0;
    const run = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => translateAuthDom(language));
    };

    run();
    const root = document.querySelector("[data-auth-shell]");
    if (!root) return () => window.cancelAnimationFrame(raf);

    const observer = new MutationObserver(run);
    observer.observe(root, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [language]);

  return (
    <div data-auth-shell className="relative min-h-screen">
      <div
        className="fixed right-4 top-20 z-50 inline-flex h-10 items-center rounded-full border border-white/15 bg-surface/90 p-1 shadow-lg backdrop-blur lg:top-5"
        aria-label={language === "en" ? "Language" : "Ngôn ngữ"}
        role="group"
      >
        {(["vi", "en"] as const).map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLanguage(code)}
            aria-pressed={language === code}
            className={`h-8 min-w-9 rounded-full px-2 text-xs font-bold transition-all ${language === code
              ? "bg-primary text-on-primary shadow-sm"
              : "text-on-surface-variant hover:text-on-surface"
              }`}
          >
            {code.toUpperCase()}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
