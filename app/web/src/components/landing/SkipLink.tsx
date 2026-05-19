"use client";

import { useLandingLanguage } from "./LanguageContext";

export default function SkipLink() {
  const { t } = useLandingLanguage();

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-lp-primary focus:text-lp-on-primary focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold"
    >
      {t("common.skipToMain")}
    </a>
  );
}
