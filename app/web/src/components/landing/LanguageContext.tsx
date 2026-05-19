"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type LandingLanguage = "vi" | "en";

const dictionaries: Record<LandingLanguage, Record<string, string>> = {
  vi: {
    "header.home": "Trang chủ Productivity Flow",
    "header.features": "Tính năng",
    "header.workflow": "Cách hoạt động",
    "header.preview": "Giao diện",
    "header.faq": "Hỏi đáp",
    "header.login": "Đăng nhập",
    "header.start": "Bắt đầu",
    "header.openMenu": "Mở menu",
    "header.closeMenu": "Đóng menu",
    "header.mobileNav": "Điều hướng di động",
    "language.label": "Ngôn ngữ",
    "theme.toLight": "Chuyển sang chế độ sáng",
    "theme.toDark": "Chuyển sang chế độ tối",
    "theme.light": "Chế độ sáng",
    "theme.dark": "Chế độ tối",
    "common.skipToMain": "Bỏ qua tới nội dung chính",

    "hero.badge": "Phiên bản 2.0 • Tích hợp Mezon",
    "hero.title": "Quản lý sự kiện thông minh & nhắc việc tự động trên",
    "hero.subtitle": "Tạo lịch, theo dõi tiến độ và nhận nhắc việc tự động qua Web Dashboard kết hợp chatbot trên nền tảng Mezon.",
    "hero.try": "Dùng thử ngay",
    "hero.connect": "Kết nối Mezon",
    "hero.benefit.reminders": "Nhắc việc tự động",
    "hero.benefit.sync": "Web + Bot đồng bộ",
    "hero.benefit.progress": "Theo dõi tiến độ",
    "hero.today": "Hôm nay",
    "hero.meeting": "Họp team Sprint Review",
    "hero.demo": "Demo báo cáo thực tập",
    "hero.auditorium": "Hội trường A",
    "hero.upcoming": "SẮP DIỄN RA",
    "hero.review": "Review CV ứng viên",
    "hero.command": "*them-lich Họp team 9h sáng mai",
    "hero.response": "Đã tạo sự kiện 'Họp team' vào 09:00 ngày mai.",
    "hero.reminderTitle": "Nhắc nhở công việc",
    "hero.reminderBody": "Demo báo cáo sẽ bắt đầu sau 15 phút",
    "hero.ack": "Đã nhận",
    "hero.snooze": "Hoãn 10p",
    "hero.done": "Xong",
    "hero.stat.events": "Sự kiện",
    "hero.stat.due": "Sắp đến hạn",
    "hero.stat.completed": "Hoàn thành",

    "features.heading": "Tất cả công cụ quản lý lịch trình trong một hệ thống",
    "features.subheading": "Tối ưu hiệu suất làm việc của bạn với sự kết hợp hoàn hảo giữa công nghệ Web Dashboard và Chatbot thông minh.",
    "features.calendar.title": "Quản lý sự kiện",
    "features.calendar.desc": "Giao diện trực quan giúp bạn tạo và sắp xếp các sự kiện quan trọng một cách khoa học.",
    "features.reminder.title": "Nhắc việc tự động",
    "features.reminder.desc": "Thông báo thông minh đa nền tảng, đảm bảo bạn không bao giờ bỏ lỡ một deadline nào.",
    "features.bot.title": "Chatbot Mezon",
    "features.bot.desc": "Tương tác trực tiếp bằng lệnh text để thêm lịch nhanh chóng ngay khi đang chat.",
    "features.stats.title": "Thống kê tiến độ",
    "features.stats.desc": "Biểu đồ phân tích hiệu suất làm việc giúp bạn đánh giá quá trình hoàn thành mục tiêu.",

    "workflow.heading": "Quy trình vận hành tối ưu",
    "workflow.create.title": "Tạo sự kiện",
    "workflow.create.desc": "Thêm lịch qua Dashboard hoặc gõ lệnh trực tiếp cho Chatbot Mezon.",
    "workflow.track.title": "Hệ thống theo dõi",
    "workflow.track.desc": "Dữ liệu được đồng bộ hóa và phân tích độ ưu tiên một cách tự động.",
    "workflow.remind.title": "Tự động nhắc việc",
    "workflow.remind.desc": "Nhận thông báo nhắc nhở 15 phút trước khi sự kiện bắt đầu qua Mezon.",

    "preview.heading": "Giao diện sản phẩm",
    "preview.dashboard.desc": "Giao diện tập trung dành cho quản trị viên.",
    "preview.bot.desc": "Tương tác nhanh chóng, mọi lúc mọi nơi.",
    "preview.bot.message": "Xin chào! Bạn có muốn tôi nhắc nhở sự kiện tiếp theo không?",
    "preview.bot.remind": "Nhắc tôi sau 5p",
    "preview.bot.details": "Xem chi tiết",

    "faq.heading": "Câu hỏi thường gặp",
    "faq.subheading": "Mọi thứ bạn cần biết trước khi bắt đầu.",
    "faq.free.q": "Productivity Flow có miễn phí không?",
    "faq.free.a": "Có! Chúng tôi cung cấp gói miễn phí với đầy đủ tính năng cơ bản bao gồm quản lý lịch, nhắc nhở, đồng bộ cơ bản và hỗ trợ Bot Mezon. Các gói nâng cao sẽ bổ sung thêm báo cáo phân tích, template nâng cao và ưu tiên hỗ trợ.",
    "faq.connect.q": "Làm thế nào để kết nối với Bot Mezon?",
    "faq.connect.a": "Sau khi đăng ký tài khoản, vào mục Cài đặt > Mezon Integration và nhấn nút 'Kết nối'. Bạn sẽ được hướng dẫn thêm Bot vào kênh Mezon của mình chỉ trong 2 bước đơn giản.",
    "faq.safe.q": "Dữ liệu của tôi có an toàn không?",
    "faq.safe.a": "Tuyệt đối! Chúng tôi sử dụng mã hóa đầu cuối cho tất cả dữ liệu. Máy chủ được đặt tại cơ sở hạ tầng đạt chuẩn ISO 27001. Bạn có toàn quyền kiểm soát và có thể xuất/xóa dữ liệu bất cứ lúc nào.",

    "cta.heading": "Biến Mezon thành trợ lý quản lý công việc của bạn",
    "cta.subheading": "Gia nhập cùng 500+ đội ngũ đang tối ưu hóa hiệu suất làm việc mỗi ngày.",
    "cta.dashboard": "Vào Dashboard",
    "cta.connect": "Kết nối Mezon",

    "footer.desc": "Hệ thống quản lý sự kiện và nhắc việc thông minh tích hợp chatbot hàng đầu dành cho cộng đồng Mezon.",
    "footer.copyright": "Đề tài thực tập tốt nghiệp — ĐH Quy Nhơn.",
    "footer.product": "Sản phẩm",
    "footer.company": "Công ty",
    "footer.features": "Tính năng",
    "footer.about": "Về chúng tôi",
    "footer.blog": "Blog công nghệ",
    "footer.contact": "Liên hệ",
  },
  en: {
    "header.home": "Productivity Flow home",
    "header.features": "Features",
    "header.workflow": "How it works",
    "header.preview": "Interface",
    "header.faq": "FAQ",
    "header.login": "Sign in",
    "header.start": "Start",
    "header.openMenu": "Open menu",
    "header.closeMenu": "Close menu",
    "header.mobileNav": "Mobile navigation",
    "language.label": "Language",
    "theme.toLight": "Switch to light mode",
    "theme.toDark": "Switch to dark mode",
    "theme.light": "Light mode",
    "theme.dark": "Dark mode",
    "common.skipToMain": "Skip to main content",

    "hero.badge": "Version 2.0 • Mezon integration",
    "hero.title": "Manage smart events & automatic reminders on",
    "hero.subtitle": "Create schedules, track progress, and receive automatic reminders through a Web Dashboard combined with a chatbot on Mezon.",
    "hero.try": "Try it now",
    "hero.connect": "Connect Mezon",
    "hero.benefit.reminders": "Automatic reminders",
    "hero.benefit.sync": "Web + Bot sync",
    "hero.benefit.progress": "Progress tracking",
    "hero.today": "Today",
    "hero.meeting": "Team Sprint Review meeting",
    "hero.demo": "Internship report demo",
    "hero.auditorium": "Auditorium A",
    "hero.upcoming": "UPCOMING",
    "hero.review": "Review candidate CV",
    "hero.command": "*add-schedule Team meeting 9am tomorrow",
    "hero.response": "Created event 'Team meeting' at 09:00 tomorrow.",
    "hero.reminderTitle": "Task reminder",
    "hero.reminderBody": "The report demo starts in 15 minutes",
    "hero.ack": "Got it",
    "hero.snooze": "Snooze 10m",
    "hero.done": "Done",
    "hero.stat.events": "Events",
    "hero.stat.due": "Due soon",
    "hero.stat.completed": "Completed",

    "features.heading": "Every scheduling tool in one system",
    "features.subheading": "Improve your productivity with a clean Web Dashboard and an intelligent chatbot working together.",
    "features.calendar.title": "Event management",
    "features.calendar.desc": "An intuitive interface helps you create and organize important events clearly.",
    "features.reminder.title": "Automatic reminders",
    "features.reminder.desc": "Smart cross-platform notifications make sure you do not miss deadlines.",
    "features.bot.title": "Mezon chatbot",
    "features.bot.desc": "Use text commands to add schedules quickly while chatting.",
    "features.stats.title": "Progress analytics",
    "features.stats.desc": "Performance charts help you evaluate how well you are completing your goals.",

    "workflow.heading": "An optimized workflow",
    "workflow.create.title": "Create events",
    "workflow.create.desc": "Add schedules in the Dashboard or type commands directly to the Mezon chatbot.",
    "workflow.track.title": "Track automatically",
    "workflow.track.desc": "Data is synchronized and priority is analyzed automatically.",
    "workflow.remind.title": "Get reminders",
    "workflow.remind.desc": "Receive reminders on Mezon 15 minutes before an event starts.",

    "preview.heading": "Product interface",
    "preview.dashboard.desc": "A focused interface for administrators.",
    "preview.bot.desc": "Fast interaction anytime, anywhere.",
    "preview.bot.message": "Hi! Would you like me to remind you about the next event?",
    "preview.bot.remind": "Remind me in 5m",
    "preview.bot.details": "View details",

    "faq.heading": "Frequently asked questions",
    "faq.subheading": "Everything you need to know before getting started.",
    "faq.free.q": "Is Productivity Flow free?",
    "faq.free.a": "Yes. We provide a free plan with core features including schedule management, reminders, basic sync, and Mezon Bot support. Advanced plans add analytics reports, advanced templates, and priority support.",
    "faq.connect.q": "How do I connect with the Mezon Bot?",
    "faq.connect.a": "After registering an account, open Settings > Mezon Integration and click Connect. You will be guided through adding the Bot to your Mezon channel in two simple steps.",
    "faq.safe.q": "Is my data safe?",
    "faq.safe.a": "Yes. We use end-to-end encryption for all data. Servers run on ISO 27001-compliant infrastructure. You stay in control and can export or delete your data at any time.",

    "cta.heading": "Turn Mezon into your work management assistant",
    "cta.subheading": "Join 500+ teams optimizing their productivity every day.",
    "cta.dashboard": "Open Dashboard",
    "cta.connect": "Connect Mezon",

    "footer.desc": "An intelligent event and reminder management system with chatbot integration for the Mezon community.",
    "footer.copyright": "Graduation internship project — Quy Nhon University.",
    "footer.product": "Product",
    "footer.company": "Company",
    "footer.features": "Features",
    "footer.about": "About us",
    "footer.blog": "Tech blog",
    "footer.contact": "Contact",
  },
};

type LandingLanguageContextValue = {
  language: LandingLanguage;
  setLanguage: (language: LandingLanguage) => void;
  t: (key: string) => string;
};

const LandingLanguageContext = createContext<LandingLanguageContextValue | undefined>(undefined);

function getInitialLanguage(): LandingLanguage {
  if (typeof window === "undefined") return "vi";
  const stored = localStorage.getItem("language");
  if (stored === "vi" || stored === "en") return stored;
  return navigator.language.toLowerCase().startsWith("en") ? "en" : "vi";
}

export function LandingLanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LandingLanguage>("vi");

  useEffect(() => {
    setLanguageState(getInitialLanguage());
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "vi" ? "vi" : "en";
  }, [language]);

  const setLanguage = useCallback((next: LandingLanguage) => {
    setLanguageState(next);
    try {
      localStorage.setItem("language", next);
    } catch { }
  }, []);

  const t = useCallback(
    (key: string) => dictionaries[language][key] ?? dictionaries.vi[key] ?? key,
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return (
    <LandingLanguageContext.Provider value={value}>
      {children}
    </LandingLanguageContext.Provider>
  );
}

export function useLandingLanguage(): LandingLanguageContextValue {
  const context = useContext(LandingLanguageContext);
  if (!context) {
    throw new Error("useLandingLanguage must be used inside LandingLanguageProvider");
  }
  return context;
}
