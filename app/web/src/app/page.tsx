import type { Metadata } from "next";
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Preview from "@/components/landing/Preview";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://focusflow.example.com";

export const metadata: Metadata = {
  title: "Productivity Flow — Quản lý sự kiện & nhắc việc tự động trên Mezon",
  description:
    "Chatbot Mezon kết hợp Web Dashboard giúp bạn quản lý lịch trình, sự kiện và nhắc việc tự động. Tăng năng suất, không bao giờ bỏ lỡ deadline.",
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    title:
      "Productivity Flow — Quản lý sự kiện & nhắc việc tự động trên Mezon",
    description:
      "Chatbot Mezon kết hợp Web Dashboard giúp bạn quản lý lịch trình, sự kiện và nhắc việc tự động.",
  },
};

export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "Productivity Flow",
        applicationCategory: "ProductivityApplication",
        operatingSystem: "Web, Mezon",
        description:
          "Hệ thống chatbot hỗ trợ quản lý sự kiện và nhắc việc tự động trên nền tảng Mezon, tích hợp Web Dashboard quản lý lịch trình.",
        url: SITE_URL,
        inLanguage: "vi-VN",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "VND",
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "5",
          ratingCount: "1",
        },
      },
      {
        "@type": "WebSite",
        name: "Productivity Flow",
        url: SITE_URL,
        inLanguage: "vi-VN",
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/lich/tim-kiem?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        name: "Khoa Công Nghệ Thông Tin — Trường Đại Học Quy Nhơn",
        url: "https://qnu.edu.vn",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-brand-teal focus:text-brand-charcoal focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold"
      >
        Bỏ qua tới nội dung chính
      </a>
      <div className="min-h-screen bg-brand-charcoal text-brand-ivory">
        <Header />
        <main id="main-content">
          <Hero />
          <Features />
          <HowItWorks />
          <Preview />
          <FAQ />
          <CTA />
        </main>
        <Footer />
      </div>
    </>
  );
}
