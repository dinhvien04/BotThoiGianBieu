import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://focusflow.example.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/api/",
          "/auth/",
          "/dashboard",
          "/dashboard/",
          "/lich",
          "/lich/",
          "/nhac-viec",
          "/the",
          "/mau-lich",
          "/chia-se",
          "/thong-ke",
          "/lich-su",
          "/nhap-xuat",
          "/thong-bao",
          "/cai-dat",
          "/tro-giup",
          "/ho-so",
          "/onboarding",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
