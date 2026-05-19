"use client";

import { useLandingLanguage } from "./LanguageContext";

export default function Features() {
  const { t } = useLandingLanguage();
  const features = [
    {
      icon: "calendar_month",
      title: t("features.calendar.title"),
      description: t("features.calendar.desc"),
    },
    {
      icon: "notifications",
      title: t("features.reminder.title"),
      description: t("features.reminder.desc"),
    },
    {
      icon: "smart_toy",
      title: t("features.bot.title"),
      description: t("features.bot.desc"),
    },
    {
      icon: "insights",
      title: t("features.stats.title"),
      description: t("features.stats.desc"),
    },
  ];

  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="py-20 sm:py-24 lg:py-32 bg-lp-surface-container-lowest"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
        <div className="text-center mb-16 sm:mb-20">
          <h2
            id="features-heading"
            className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-lp-on-surface"
          >
            {t("features.heading")}
          </h2>
          <p className="text-lp-on-surface-variant text-base max-w-2xl mx-auto">
            {t("features.subheading")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="glass-card p-6 sm:p-8 rounded-3xl hover:border-lp-primary/40 hover-lift group"
            >
              <div className="w-12 h-12 rounded-xl bg-lp-primary/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <span
                  className="material-symbols-outlined text-lp-primary text-[28px]"
                  aria-hidden="true"
                >
                  {feature.icon}
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-lp-on-surface">
                {feature.title}
              </h3>
              <p className="text-lp-on-surface-variant text-sm leading-relaxed">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
