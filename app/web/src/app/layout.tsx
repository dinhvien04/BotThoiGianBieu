import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://focusflow.example.com";
const SITE_NAME = "Productivity Flow";
const SITE_TITLE =
  "Productivity Flow — Chatbot quản lý sự kiện & nhắc việc tự động trên Mezon";
const SITE_DESCRIPTION =
  "Hệ thống chatbot hỗ trợ quản lý sự kiện và nhắc việc tự động trên nền tảng Mezon, đồng bộ với Web Dashboard hiện đại. Tăng năng suất, không bỏ lỡ deadline.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  generator: "Next.js",
  keywords: [
    "Mezon",
    "chatbot Mezon",
    "quản lý sự kiện",
    "nhắc việc tự động",
    "thời gian biểu",
    "lịch trình",
    "productivity",
    "Productivity Flow",
    "FocusFlow",
    "lịch làm việc",
    "task management",
  ],
  authors: [{ name: "Đoàn Võ Nguyên", url: SITE_URL }],
  creator: "Đoàn Võ Nguyên",
  publisher: "Khoa Công Nghệ Thông Tin — Trường Đại Học Quy Nhơn",
  category: "productivity",
  alternates: {
    canonical: "/",
    languages: {
      "vi-VN": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: SITE_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf7ff" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1A1B" },
  ],
};

const themeInitScript = `
(function(){
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (prefersDark ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch (e) {}
})();
`;

const devExtensionErrorFilterScript =
  process.env.NODE_ENV === "development"
    ? `
(function(){
  function collectText(value) {
    if (!value) return "";
    if (typeof value === "string") return value;

    var parts = [];
    try {
      parts.push(value.message, value.stack, value.filename);
      parts.push(collectText(value.error));
      parts.push(collectText(value.reason));
    } catch (e) {}

    return parts.filter(Boolean).join("\\n");
  }

  function isExtensionError(value) {
    var text = collectText(value);
    return text.indexOf("chrome-extension://") !== -1 ||
      text.indexOf("moz-extension://") !== -1 ||
      text.indexOf("safari-web-extension://") !== -1;
  }

  function silence(event) {
    if (!isExtensionError(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  window.addEventListener("error", silence, true);
  window.addEventListener("unhandledrejection", silence, true);
})();
`
    : "";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
        {devExtensionErrorFilterScript ? (
          <Script
            id="dev-extension-error-filter"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: devExtensionErrorFilterScript,
            }}
          />
        ) : null}
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.variable} font-inter antialiased`}>
        {children}
      </body>
    </html>
  );
}
