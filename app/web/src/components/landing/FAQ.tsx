"use client";

import { useState } from "react";
import { useLandingLanguage } from "./LanguageContext";

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const { t } = useLandingLanguage();
  const faqs = [
    {
      question: t("faq.free.q"),
      answer: t("faq.free.a"),
    },
    {
      question: t("faq.connect.q"),
      answer: t("faq.connect.a"),
    },
    {
      question: t("faq.safe.q"),
      answer: t("faq.safe.a"),
    },
  ];

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="py-20 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-16 max-w-3xl mx-auto"
    >
      <div className="text-center mb-12 sm:mb-16 md:mb-20">
        <h2 id="faq-heading" className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 text-lp-on-surface">
          {t("faq.heading")}
        </h2>
        <p className="text-lp-on-surface-variant text-sm">
          {t("faq.subheading")}
        </p>
      </div>

      <div className="space-y-3 sm:space-y-4" itemScope itemType="https://schema.org/FAQPage">
        {faqs.map((faq, index) => (
          <article
            key={index}
            className="glass-card rounded-2xl overflow-hidden transition-all"
            itemProp="mainEntity"
            itemScope
            itemType="https://schema.org/Question"
          >
            <button
              type="button"
              className="w-full px-5 sm:px-8 py-4 sm:py-6 flex items-center justify-between text-left gap-3"
              onClick={() => setOpen(open === index ? null : index)}
              aria-expanded={open === index}
              aria-controls={`faq-panel-${index}`}
            >
              <span className="text-base sm:text-lg font-semibold text-lp-on-surface" itemProp="name">
                {faq.question}
              </span>
              <svg
                className={`w-5 h-5 text-lp-primary flex-shrink-0 transition-transform ${open === index ? "rotate-180" : ""
                  }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
              id={`faq-panel-${index}`}
              role="region"
              itemScope
              itemProp="acceptedAnswer"
              itemType="https://schema.org/Answer"
              className={`overflow-hidden transition-all duration-300 ${open === index ? "max-h-60 pb-4 sm:pb-6" : "max-h-0"
                }`}
            >
              <p className="px-5 sm:px-8 text-sm text-lp-on-surface-variant leading-relaxed" itemProp="text">
                {faq.answer}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
