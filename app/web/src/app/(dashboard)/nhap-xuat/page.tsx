"use client";

import { ChangeEvent, useRef, useState } from "react";
import { createSchedule, getSchedules, type Schedule } from "@/lib/api";
import {
  downloadTextFile,
  parseCsvSchedules,
  parseIcsSchedules,
  schedulesToCsv,
  schedulesToIcs,
  schedulesToJson,
  type ScheduleImportInput,
} from "@/lib/export-utils";
import { useToast } from "@/components/dashboard/Toast";
import { useLanguage } from "@/components/dashboard/LanguageContext";

type ExportFormat = "excel" | "csv" | "json" | "ics" | "pdf";
type ImportKind = "csv" | "ics";

function getRangeBounds(range: string): { start?: Date; end?: Date } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (range === "week") {
    const day = (now.getDay() + 6) % 7;
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 7);
    return { start, end };
  }

  if (range === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setFullYear(start.getFullYear(), start.getMonth() + 1, 1);
    end.setHours(0, 0, 0, 0);
    return { start, end };
  }

  if (range === "last-month") {
    start.setFullYear(now.getFullYear(), now.getMonth() - 1, 1);
    start.setHours(0, 0, 0, 0);
    end.setFullYear(now.getFullYear(), now.getMonth(), 1);
    end.setHours(0, 0, 0, 0);
    return { start, end };
  }

  if (range === "quarter") {
    const quarterStart = Math.floor(now.getMonth() / 3) * 3;
    start.setFullYear(now.getFullYear(), quarterStart, 1);
    start.setHours(0, 0, 0, 0);
    end.setFullYear(now.getFullYear(), quarterStart + 3, 1);
    end.setHours(0, 0, 0, 0);
    return { start, end };
  }

  if (range === "year") {
    start.setFullYear(now.getFullYear(), 0, 1);
    start.setHours(0, 0, 0, 0);
    end.setFullYear(now.getFullYear() + 1, 0, 1);
    end.setHours(0, 0, 0, 0);
    return { start, end };
  }

  return {};
}

function filterSchedules(schedules: Schedule[], range: string, itemType: string): Schedule[] {
  const { start, end } = getRangeBounds(range);
  return schedules.filter((schedule) => {
    if (itemType !== "all" && schedule.item_type !== itemType) return false;
    const time = new Date(schedule.start_time).getTime();
    if (start && time < start.getTime()) return false;
    if (end && time >= end.getTime()) return false;
    return true;
  });
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function schedulesReportHtml(schedules: Schedule[]): string {
  const rows = schedules
    .map(
      (schedule) => `<tr>
        <td>${escapeHtml(schedule.id)}</td>
        <td>${escapeHtml(schedule.title)}</td>
        <td>${escapeHtml(schedule.item_type)}</td>
        <td>${escapeHtml(new Date(schedule.start_time).toLocaleString("vi-VN"))}</td>
        <td>${escapeHtml(schedule.status)}</td>
        <td>${escapeHtml(schedule.priority)}</td>
      </tr>`,
    )
    .join("");
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>FocusFlow schedules report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #1d1b20; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f2ecf4; }
  </style>
</head>
<body>
  <h1>FocusFlow Pro - Báo cáo lịch</h1>
  <p>Tổng số lịch: ${schedules.length}</p>
  <table>
    <thead><tr><th>ID</th><th>Tiêu đề</th><th>Loại</th><th>Bắt đầu</th><th>Trạng thái</th><th>Ưu tiên</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6">Không có dữ liệu</td></tr>'}</tbody>
  </table>
</body>
</html>`;
}

export default function ImportExportPage() {
  const { showToast } = useToast();
  const { language } = useLanguage();
  const isEnglish = language === "en";
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<"import" | "export">("import");
  const [pendingImportKind, setPendingImportKind] = useState<ImportKind>("csv");
  const [range, setRange] = useState("all");
  const [itemType, setItemType] = useState("all");
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [importing, setImporting] = useState(false);
  const [lastImportSummary, setLastImportSummary] = useState<string | null>(null);

  const chooseFile = (kind: ImportKind) => {
    setPendingImportKind(kind);
    fileInputRef.current?.click();
  };

  const loadAllSchedules = async (): Promise<Schedule[]> => {
    const all: Schedule[] = [];
    let page = 1;
    let total = 0;
    do {
      const res = await getSchedules({ status: "all", page, limit: 50 });
      const items = res.items ?? [];
      all.push(...items);
      total = res.total ?? all.length;
      page += 1;
    } while (all.length < total);
    return filterSchedules(all, range, itemType);
  };

  const handleExport = async (format: ExportFormat) => {
    setExporting(format);
    try {
      const schedules = await loadAllSchedules();
      const stamp = new Date().toISOString().slice(0, 10);
      if (format === "json") {
        downloadTextFile(`focusflow-schedules-${stamp}.json`, schedulesToJson(schedules), "application/json;charset=utf-8");
      } else if (format === "ics") {
        downloadTextFile(`focusflow-schedules-${stamp}.ics`, schedulesToIcs(schedules), "text/calendar;charset=utf-8");
      } else if (format === "pdf") {
        downloadTextFile(`focusflow-report-${stamp}.html`, schedulesReportHtml(schedules), "text/html;charset=utf-8");
      } else {
        downloadTextFile(`focusflow-schedules-${stamp}.csv`, schedulesToCsv(schedules), "text/csv;charset=utf-8");
      }
      showToast(
        format === "excel"
          ? isEnglish ? "CSV exported and can be opened in Excel." : "Đã xuất CSV, có thể mở bằng Excel."
          : format === "pdf"
            ? isEnglish ? "HTML report exported for printing or saving as PDF." : "Đã xuất báo cáo HTML để in/lưu PDF."
            : isEnglish ? "Data exported." : "Đã xuất dữ liệu.",
        "success",
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : (isEnglish ? "Could not export data." : "Không thể xuất dữ liệu."), "error");
    } finally {
      setExporting(null);
    }
  };

  const createImportedSchedules = async (rows: ScheduleImportInput[]) => {
    let success = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        await createSchedule(row);
        success += 1;
      } catch {
        failed += 1;
      }
    }
    return { success, failed };
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setImporting(true);
    setLastImportSummary(null);
    try {
      const text = await file.text();
      const rows = pendingImportKind === "ics" ? parseIcsSchedules(text) : parseCsvSchedules(text);
      if (rows.length === 0) {
        showToast(isEnglish ? "No valid schedules were found in the file." : "Không tìm thấy lịch hợp lệ trong file.", "warning");
        return;
      }
      const result = await createImportedSchedules(rows);
      const summary = isEnglish
        ? `Imported ${result.success}/${rows.length} schedules${result.failed ? `, ${result.failed} failed` : ""}.`
        : `Đã nhập ${result.success}/${rows.length} lịch${result.failed ? `, lỗi ${result.failed}` : ""}.`;
      setLastImportSummary(summary);
      showToast(summary, result.failed ? "warning" : "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : (isEnglish ? "Could not import data." : "Không thể nhập dữ liệu."), "error");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">{isEnglish ? "Import & Export data" : "Nhập & Xuất dữ liệu"}</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          {isEnglish ? "Import schedules from CSV/ICS or export data from the current backend." : "Nhập lịch từ CSV/ICS hoặc xuất dữ liệu từ backend hiện tại."}
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={pendingImportKind === "ics" ? ".ics,text/calendar" : ".csv,text/csv"}
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex gap-1 bg-surface-container rounded-xl p-1">
        <button
          onClick={() => setActiveTab("import")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "import" ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant"}`}
        >
          {isEnglish ? "Import data" : "Nhập dữ liệu"}
        </button>
        <button
          onClick={() => setActiveTab("export")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "export" ? "bg-surface-container-lowest text-on-surface shadow-sm" : "text-on-surface-variant"}`}
        >
          {isEnglish ? "Export data" : "Xuất dữ liệu"}
        </button>
      </div>

      {activeTab === "import" && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => chooseFile("csv")}
            disabled={importing}
            className="w-full bg-surface-container-lowest rounded-2xl p-8 shadow-sm border-2 border-dashed border-outline-variant hover:border-primary/40 transition-colors disabled:opacity-60"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <p className="font-medium text-on-surface">
                {importing ? (isEnglish ? "Importing data..." : "Đang nhập dữ liệu...") : (isEnglish ? "Click to choose a CSV file" : "Nhấn để chọn file CSV")}
              </p>
              <p className="text-sm text-on-surface-variant mt-1">
                {isEnglish
                  ? "Required minimum columns: title, start_time. CSV files exported from the system can be imported directly."
                  : "Cần cột tối thiểu: title, start_time. File CSV xuất từ hệ thống có thể nhập lại trực tiếp."}
              </p>
            </div>
          </button>

          {lastImportSummary && (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 text-sm text-on-surface">
              {lastImportSummary}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => showToast(isEnglish ? "The web app does not read .xlsx yet. Save Excel as CSV and import it." : "Web chưa có thư viện đọc .xlsx. Hãy lưu Excel thành CSV rồi nhập.", "warning")}
              className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm text-left hover:shadow-md transition-shadow"
            >
              <span className="text-2xl">XLS</span>
              <p className="font-medium text-on-surface mt-3">Excel (.xlsx)</p>
              <p className="text-xs text-on-surface-variant mt-1">{isEnglish ? "Save as CSV to import on the web" : "Lưu thành CSV để nhập trên web"}</p>
            </button>
            <button
              type="button"
              onClick={() => chooseFile("csv")}
              className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm text-left hover:shadow-md transition-shadow"
            >
              <span className="text-2xl">CSV</span>
              <p className="font-medium text-on-surface mt-3">CSV (.csv)</p>
              <p className="text-xs text-on-surface-variant mt-1">{isEnglish ? "Import schedules from a spreadsheet file" : "Nhập lịch từ file bảng tính"}</p>
            </button>
            <button
              type="button"
              onClick={() => chooseFile("ics")}
              className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm text-left hover:shadow-md transition-shadow"
            >
              <span className="text-2xl">ICS</span>
              <p className="font-medium text-on-surface mt-3">iCalendar (.ics)</p>
              <p className="text-xs text-on-surface-variant mt-1">{isEnglish ? "Import from Google Calendar or Outlook" : "Nhập từ Google Calendar, Outlook"}</p>
            </button>
          </div>
        </div>
      )}

      {activeTab === "export" && (
        <div className="space-y-4">
          {[
            { format: "excel" as const, title: "Excel compatible CSV", desc: isEnglish ? "Export CSV with BOM so Excel opens Vietnamese text correctly" : "Xuất CSV có BOM để Excel mở đúng tiếng Việt", icon: "XLS" },
            { format: "csv" as const, title: "CSV (.csv)", desc: isEnglish ? "Export data as CSV" : "Xuất dữ liệu dạng CSV", icon: "CSV" },
            { format: "json" as const, title: "JSON (.json)", desc: isEnglish ? "Export complete schedule data as JSON" : "Xuất đầy đủ dữ liệu lịch dạng JSON", icon: "JSON" },
            { format: "ics" as const, title: "iCalendar (.ics)", desc: isEnglish ? "Export for import into Google Calendar or Outlook" : "Xuất để import vào Google Calendar, Outlook", icon: "ICS" },
            { format: "pdf" as const, title: "Printable report", desc: isEnglish ? "Export an HTML report for printing or saving as PDF" : "Xuất báo cáo HTML để in hoặc lưu PDF", icon: "PDF" },
          ].map((item) => (
            <div key={item.format} className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <span className="text-sm font-bold text-primary bg-primary/10 rounded-lg px-2.5 py-2">{item.icon}</span>
                <div className="min-w-0">
                  <p className="font-medium text-on-surface">{item.title}</p>
                  <p className="text-sm text-on-surface-variant mt-0.5">{item.desc}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleExport(item.format)}
                disabled={exporting !== null}
                className="px-5 py-2.5 bg-primary text-on-primary rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                {exporting === item.format ? (isEnglish ? "Exporting..." : "Đang xuất...") : (isEnglish ? "Download" : "Tải xuống")}
              </button>
            </div>
          ))}

          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-on-surface mb-4">{isEnglish ? "Export options" : "Tùy chọn xuất"}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">{isEnglish ? "Date range" : "Khoảng thời gian"}</label>
                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface-container-lowest"
                >
                  <option value="all">{isEnglish ? "All" : "Tất cả"}</option>
                  <option value="week">{isEnglish ? "This week" : "Tuần này"}</option>
                  <option value="month">{isEnglish ? "This month" : "Tháng này"}</option>
                  <option value="last-month">{isEnglish ? "Last month" : "Tháng trước"}</option>
                  <option value="quarter">{isEnglish ? "This quarter" : "Quý này"}</option>
                  <option value="year">{isEnglish ? "This year" : "Năm nay"}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">{isEnglish ? "Event type" : "Loại sự kiện"}</label>
                <select
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value)}
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface-container-lowest"
                >
                  <option value="all">{isEnglish ? "All types" : "Tất cả loại"}</option>
                  <option value="task">{isEnglish ? "Task" : "Công việc"}</option>
                  <option value="meeting">{isEnglish ? "Meeting" : "Cuộc họp"}</option>
                  <option value="event">{isEnglish ? "Event" : "Sự kiện"}</option>
                  <option value="reminder">{isEnglish ? "Reminder" : "Nhắc nhở"}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
