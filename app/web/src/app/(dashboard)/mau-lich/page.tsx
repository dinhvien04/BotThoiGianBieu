"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  createTemplate,
  deleteTemplate,
  updateTemplate,
  type Template,
} from "@/lib/api";
import {
  priorityColors,
  priorityLabels,
  schedulePriorityOptions,
  scheduleTypeOptions,
  typeLabels,
} from "@/lib/mock-data";
import { useTemplates } from "@/lib/hooks";
import { CardSkeleton } from "@/components/dashboard/SkeletonLoader";
import { DataLoadError } from "@/components/dashboard/ErrorStates";
import { useToast } from "@/components/dashboard/Toast";

type TemplateForm = {
  name: string;
  title: string;
  description: string;
  item_type: string;
  duration_minutes: string;
  default_remind_minutes: string;
  priority: string;
};

const emptyForm: TemplateForm = {
  name: "",
  title: "",
  description: "",
  item_type: "task",
  duration_minutes: "30",
  default_remind_minutes: "15",
  priority: "normal",
};

function templateToForm(template: Template): TemplateForm {
  return {
    name: template.name,
    title: template.title,
    description: template.description ?? "",
    item_type: template.item_type,
    duration_minutes: template.duration_minutes == null ? "" : String(template.duration_minutes),
    default_remind_minutes:
      template.default_remind_minutes == null ? "" : String(template.default_remind_minutes),
    priority: template.priority,
  };
}

function toOptionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function TemplatesPage() {
  const { showToast } = useToast();
  const { data: templates, loading, error, refetch } = useTemplates();
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingName, setDeletingName] = useState<string | null>(null);

  const sortedTemplates = useMemo(() => templates ?? [], [templates]);

  const openCreate = () => {
    setEditingName(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (template: Template) => {
    setEditingName(template.name);
    setForm(templateToForm(template));
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingName(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const name = form.name.trim().toLowerCase();
    const title = form.title.trim();
    if (!name || !title) {
      showToast("Tên template và tiêu đề là bắt buộc.", "warning");
      return;
    }
    if (!/^[a-z0-9_-]+$/.test(name)) {
      showToast("Tên template chỉ dùng chữ thường, số, dấu gạch ngang hoặc gạch dưới.", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        title,
        description: form.description.trim() || null,
        item_type: form.item_type,
        duration_minutes: toOptionalNumber(form.duration_minutes) ?? null,
        default_remind_minutes: toOptionalNumber(form.default_remind_minutes) ?? null,
        priority: form.priority,
      };
      const createPayload = {
        name: payload.name,
        title: payload.title,
        description: payload.description ?? undefined,
        item_type: payload.item_type,
        duration_minutes: payload.duration_minutes ?? undefined,
        default_remind_minutes: payload.default_remind_minutes ?? undefined,
        priority: payload.priority,
      };
      const res = editingName
        ? await updateTemplate(editingName, payload)
        : await createTemplate(createPayload);
      if (!res.success) throw new Error(res.error ?? "Template API error");
      showToast(editingName ? "Đã cập nhật template." : "Đã tạo template mới.", "success");
      closeModal();
      refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể lưu template.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!window.confirm(`Xoá template "${name}"?`)) return;
    setDeletingName(name);
    try {
      const res = await deleteTemplate(name);
      if (!res.success) throw new Error("Không xoá được template.");
      showToast("Đã xoá template.", "success");
      refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể xoá template.", "error");
    } finally {
      setDeletingName(null);
    }
  };

  const handleDuplicate = async (template: Template) => {
    const suffix = String(Date.now()).slice(-5);
    try {
      const res = await createTemplate({
        name: `${template.name}-copy-${suffix}`.slice(0, 50),
        title: `${template.title} (copy)`,
        description: template.description ?? undefined,
        item_type: template.item_type,
        duration_minutes: template.duration_minutes ?? undefined,
        default_remind_minutes: template.default_remind_minutes ?? undefined,
        priority: template.priority,
      });
      if (!res.success) throw new Error(res.error ?? "Template API error");
      showToast("Đã nhân bản template.", "success");
      refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể nhân bản template.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Mẫu lịch của tôi</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Tạo mẫu để điền nhanh tiêu đề, loại lịch, thời lượng và nhắc việc.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Tạo template mới
        </button>
      </div>

      {error && !loading && <DataLoadError onRetry={refetch} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {loading && !templates && [1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        {sortedTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container-high hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs px-2 py-0.5 rounded-full font-bold text-on-primary bg-primary">
                {typeLabels[template.item_type] || template.item_type}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-bold text-on-primary"
                style={{ backgroundColor: priorityColors[template.priority] ?? "#6750A4" }}
              >
                {priorityLabels[template.priority] ?? template.priority}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mb-1">/{template.name}</p>
            <h3 className="text-lg font-bold text-on-surface">{template.title}</h3>
            {template.description && (
              <p className="text-sm text-on-surface-variant mt-1 italic">&ldquo;{template.description}&rdquo;</p>
            )}

            <div className="mt-4 space-y-1.5 text-sm text-on-surface-variant">
              {template.duration_minutes != null && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Thời lượng: {template.duration_minutes} phút
                </div>
              )}
              {template.default_remind_minutes != null && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  Nhắc trước: {template.default_remind_minutes} phút
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-5">
              <Link
                href={`/lich/tao-moi?template=${encodeURIComponent(template.name)}`}
                className="flex-1 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors text-center"
              >
                Dùng ngay
              </Link>
              <button
                type="button"
                onClick={() => openEdit(template)}
                aria-label="Sửa template"
                className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => handleDuplicate(template)}
                aria-label="Nhân bản template"
                className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.5A1.125 1.125 0 014 20.625V7.875C4 7.254 4.504 6.75 5.125 6.75H6.75m9 10.5h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v12.75c0 .621.504 1.125 1.125 1.125h6.375z" />
                </svg>
              </button>
              <button
                type="button"
                disabled={deletingName === template.name}
                onClick={() => handleDelete(template.name)}
                aria-label="Xoá template"
                className="p-2 text-error/70 hover:bg-error/5 rounded-lg transition-colors disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21A48.108 48.108 0 0015.75 5.4m-7.5 0c-1.18.037-2.09 1.022-2.09 2.201v.916m12.818-2.727L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={openCreate}
          className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border-2 border-dashed border-outline-variant flex flex-col items-center justify-center min-h-[240px] hover:border-primary/50 transition-colors group"
        >
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-3 group-hover:bg-primary/10">
            <svg className="w-6 h-6 text-on-surface-variant group-hover:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <p className="font-semibold text-on-surface">Thêm mẫu mới</p>
          <p className="text-xs text-on-surface-variant mt-1 text-center">
            Lưu các cấu hình lịch thường dùng.
          </p>
        </button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-xl p-6 space-y-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-on-surface">
                  {editingName ? "Chỉnh sửa template" : "Tạo template mới"}
                </h2>
                <p className="text-sm text-on-surface-variant mt-1">
                  Tên template dùng chữ thường, ví dụ: daily-standup.
                </p>
              </div>
              <button type="button" onClick={closeModal} className="p-2 rounded-lg hover:bg-surface-container">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-medium text-on-surface mb-1.5">Tên template</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="daily-standup"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-on-surface mb-1.5">Loại lịch</span>
                <select
                  value={form.item_type}
                  onChange={(e) => setForm((prev) => ({ ...prev, item_type: e.target.value }))}
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {scheduleTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="block text-sm font-medium text-on-surface mb-1.5">Tiêu đề</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Daily standup"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="block text-sm font-medium text-on-surface mb-1.5">Mô tả</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-on-surface mb-1.5">Thời lượng phút</span>
                <input
                  type="number"
                  min="1"
                  value={form.duration_minutes}
                  onChange={(e) => setForm((prev) => ({ ...prev, duration_minutes: e.target.value }))}
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-on-surface mb-1.5">Nhắc trước phút</span>
                <input
                  type="number"
                  min="0"
                  value={form.default_remind_minutes}
                  onChange={(e) => setForm((prev) => ({ ...prev, default_remind_minutes: e.target.value }))}
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-on-surface mb-1.5">Ưu tiên</span>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {schedulePriorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-5 py-2.5 border border-outline-variant rounded-xl text-on-surface font-medium text-sm hover:bg-surface-container transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-primary text-on-primary rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Đang lưu..." : "Lưu template"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
