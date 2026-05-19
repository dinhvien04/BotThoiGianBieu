"use client";

import Link from "next/link";
import { useLandingLanguage } from "./LanguageContext";

export default function Hero() {
  const { t } = useLandingLanguage();
  const benefits = [
    t("hero.benefit.reminders"),
    t("hero.benefit.sync"),
    t("hero.benefit.progress"),
  ];

  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="relative min-h-screen flex items-center pt-16 sm:pt-20 pb-24 hero-gradient"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center w-full">
        {/* Left side */}
        <div className="space-y-6 sm:space-y-8">
          <div className="inline-flex items-center gap-2 bg-lp-tertiary/10 text-lp-tertiary border border-lp-tertiary/30 px-4 py-1.5 rounded-full text-xs font-medium">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              release_alert
            </span>
            {t("hero.badge")}
          </div>

          <h1
            id="hero-heading"
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight text-lp-on-surface"
          >
            {t("hero.title")}{" "}
            <span className="bg-gradient-to-r from-lp-primary to-lp-primary-container bg-clip-text text-transparent">Mezon</span>
          </h1>

          <p className="text-base sm:text-lg text-lp-on-surface-variant max-w-xl leading-relaxed">
            {t("hero.subtitle")}
          </p>

          <div className="flex flex-wrap gap-3 sm:gap-4">
            <Link
              href="/dang-nhap"
              className="bg-lp-primary text-lp-on-primary font-bold px-7 sm:px-9 py-3.5 sm:py-4 rounded-full shadow-xl shadow-lp-primary/25 hover:shadow-lp-primary/40 hover:scale-[1.02] active:scale-95 transition-all"
            >
              {t("hero.try")}
            </Link>
            <button
              type="button"
              className="border border-lp-outline-variant/60 text-lp-on-surface font-semibold px-7 sm:px-9 py-3.5 sm:py-4 rounded-full hover:bg-lp-surface-container-high/60 hover:border-lp-outline-variant transition-all"
            >
              {t("hero.connect")}
            </button>
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            {benefits.map((benefit) => (
              <div
                key={benefit}
                className="flex items-center gap-2 text-lp-on-surface-variant text-sm"
              >
                <span
                  className="material-symbols-outlined text-lp-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                {benefit}
              </div>
            ))}
          </div>
        </div>

        {/* Right side: floating mockups (desktop only) */}
        <div className="relative h-[600px] hidden lg:block">
          {/* Main dashboard card */}
          <div className="absolute top-0 left-0 w-full glass-card rounded-3xl p-6 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] z-10 animate-float-slow">
            <div className="flex justify-between items-center mb-6 border-b border-lp-outline-variant/40 pb-3">
              <div className="text-sm font-medium flex items-center gap-2 text-lp-on-surface">
                <span
                  className="material-symbols-outlined text-lp-primary"
                  aria-hidden="true"
                >
                  calendar_today
                </span>
                {t("hero.today")}
              </div>
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-lp-error" />
                <div className="w-3 h-3 rounded-full bg-lp-tertiary" />
                <div className="w-3 h-3 rounded-full bg-lp-primary" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-lp-surface-container-low p-3 rounded-lg flex items-center justify-between border border-lp-outline-variant/30">
                <div>
                  <p className="text-sm font-medium text-lp-on-surface">
                    {t("hero.meeting")}
                  </p>
                  <p className="text-xs text-lp-on-surface-variant">
                    09:00 - 10:30 • Google Meet
                  </p>
                </div>
                <span
                  className="material-symbols-outlined text-lp-primary"
                  aria-hidden="true"
                >
                  more_vert
                </span>
              </div>

              <div className="bg-lp-primary/10 p-3 rounded-lg flex items-center justify-between border border-lp-primary/30">
                <div>
                  <p className="text-sm font-bold text-lp-primary">
                    {t("hero.demo")}
                  </p>
                  <p className="text-xs text-lp-on-surface-variant">
                    14:00 - 15:30 • {t("hero.auditorium")}
                  </p>
                </div>
                <span className="bg-lp-primary text-lp-on-primary px-2 py-0.5 rounded text-[10px] font-bold animate-glow-pulse">
                  {t("hero.upcoming")}
                </span>
              </div>

              <div className="bg-lp-surface-container-low p-3 rounded-lg flex items-center justify-between border border-lp-outline-variant/30 opacity-60">
                <div>
                  <p className="text-sm font-medium line-through text-lp-on-surface">
                    {t("hero.review")}
                  </p>
                  <p className="text-xs text-lp-on-surface-variant">
                    16:00 - 17:00
                  </p>
                </div>
                <span
                  className="material-symbols-outlined text-green-500"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  check_circle
                </span>
              </div>
            </div>
          </div>

          {/* Stats cards */}
          <div className="absolute -bottom-10 left-0 flex gap-4 z-20">
            <div className="glass-card p-4 rounded-3xl min-w-[120px] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4)]">
              <p className="text-lp-on-surface-variant text-xs mb-1">{t("hero.stat.events")}</p>
              <p className="text-2xl font-bold text-lp-primary">12</p>
            </div>
            <div className="glass-card p-4 rounded-3xl min-w-[120px] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4)]">
              <p className="text-lp-on-surface-variant text-xs mb-1">{t("hero.stat.due")}</p>
              <p className="text-2xl font-bold text-lp-tertiary">04</p>
            </div>
            <div className="glass-card p-4 rounded-3xl min-w-[120px] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4)]">
              <p className="text-lp-on-surface-variant text-xs mb-1">{t("hero.stat.completed")}</p>
              <p className="text-2xl font-bold text-lp-on-surface">86%</p>
            </div>
          </div>

          {/* Chatbot bubble */}
          <div className="absolute top-20 -right-6 xl:-right-12 w-72 xl:w-80 glass-card rounded-3xl p-5 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] z-30 border border-lp-primary/15 animate-float-medium">
            <div className="flex items-center gap-3 mb-4 border-b border-lp-outline-variant/40 pb-2">
              <div className="w-8 h-8 rounded-full bg-lp-primary flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-lp-on-primary text-[18px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  smart_toy
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-lp-on-surface">
                  Mezon Assistant
                </p>
                <p className="text-[10px] text-green-500 flex items-center gap-1">
                  ● Online
                </p>
              </div>
            </div>
            <div className="space-y-2 overflow-hidden">
              <div className="flex justify-end">
                <div className="bg-lp-primary/20 text-lp-on-surface p-2.5 rounded-2xl rounded-tr-none text-xs">
                  {t("hero.command")}
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-lp-surface-container-low text-lp-on-surface p-2.5 rounded-2xl rounded-tl-none text-xs border border-lp-outline-variant/30 flex items-center gap-1">
                  <span>{t("hero.response")}</span>
                  <span className="inline-block w-0.5 h-3 bg-lp-primary animate-blink ml-0.5" aria-hidden="true" />
                </div>
              </div>
              <div className="flex justify-start gap-1 pl-1" aria-hidden="true">
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-lp-on-surface-variant inline-block" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-lp-on-surface-variant inline-block" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-lp-on-surface-variant inline-block" />
              </div>
            </div>
          </div>

          {/* Reminder popup */}
          <div className="absolute bottom-20 -right-6 xl:-right-16 w-72 glass-card rounded-3xl p-5 border border-lp-tertiary/30 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] z-40 animate-float-fast">
            <div className="flex items-start gap-3 mb-3">
              <span
                className="material-symbols-outlined text-lp-tertiary animate-pulse"
                aria-hidden="true"
              >
                notifications_active
              </span>
              <div>
                <p className="text-sm font-bold text-lp-on-surface">
                  {t("hero.reminderTitle")}
                </p>
                <p className="text-xs text-lp-on-surface-variant">
                  {t("hero.reminderBody")}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 bg-lp-tertiary text-lp-on-tertiary text-[11px] font-bold py-2 rounded-lg"
              >
                {t("hero.ack")}
              </button>
              <button
                type="button"
                className="flex-1 border border-lp-outline-variant text-lp-on-surface-variant text-[11px] py-2 rounded-lg"
              >
                {t("hero.snooze")}
              </button>
              <button
                type="button"
                className="flex-1 bg-lp-surface-container-high text-lp-on-surface text-[11px] py-2 rounded-lg"
              >
                {t("hero.done")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
