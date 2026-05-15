import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${inter.variable} font-inter antialiased`}>
        {children}
      </body>
    </html>
  );
}
