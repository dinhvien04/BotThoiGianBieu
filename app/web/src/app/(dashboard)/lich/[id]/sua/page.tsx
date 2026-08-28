'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  schedulePriorityOptions,
  scheduleTypeOptions,
  statusColors,
  statusLabels,
  toApiScheduleItemType,
  toApiSchedulePriority,
} from '@/lib/mock-data';
import { attachTags, detachTag, updateSchedule } from '@/lib/api';
import { useScheduleById } from '@/lib/hooks';
import { useToast } from '@/components/dashboard/Toast';

function normalizeTagName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
}

function uniqueNormalizedTags(tags: string[]) {
  return Array.from(
    new Set(
      tags
        .map((tag) => normalizeTagName(tag))
        .filter((tag): tag is string => Boolean(tag)),
    ),
  );
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function parseScheduleDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateInputValue(value?: string | null) {
  const date = parseScheduleDate(value);
  if (!date) return '';
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function toTimeInputValue(value?: string | null) {
  const date = parseScheduleDate(value);
  if (!date) return '';
  return `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

export default function EditSchedulePage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const id = Number(params.id);
  const { data: schedule, loading } = useScheduleById(id);
  const [saving, setSaving] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [form, setForm] = useState<{
    type: string;
    title: string;
    description: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    priority: string;
    reminder: string;
    recurrence: string;
    tags: string[];
  } | null>(null);

  // Populate form once schedule loads
  useEffect(() => {
    if (schedule && !form) {
      setForm({
        type: toApiScheduleItemType(schedule.item_type),
        title: schedule.title || '',
        description: schedule.description || '',
        startDate: toDateInputValue(schedule.start_time),
        startTime: toTimeInputValue(schedule.start_time),
        endDate: toDateInputValue(schedule.end_time),
        endTime: toTimeInputValue(schedule.end_time),
        priority: toApiSchedulePriority(schedule.priority),
        reminder: '15',
        recurrence: schedule.recurrence_type || '',
        tags: schedule.tags ? schedule.tags.map((t) => t.name || '') : [],
      });
    }
  }, [schedule, form]);

  const canSave = Boolean(form?.title && form?.startDate && form?.startTime) && !saving;

  const handleAddTag = () => {
    if (!form) return;

    const tagName = normalizeTagName(tagDraft);
    if (!tagName) {
      showToast('Tag chỉ dùng chữ, số, dấu gạch ngang hoặc gạch dưới.', 'error');
      return;
    }
    if (tagName.length > 30) {
      showToast('Tên tag tối đa 30 ký tự.', 'error');
      return;
    }
    if (form.tags.some((tag) => normalizeTagName(tag) === tagName)) {
      showToast('Tag này đã có trong lịch.', 'error');
      return;
    }

    setForm({ ...form, tags: [...form.tags, tagName] });
    setTagDraft('');
    setAddingTag(false);
  };

  const handleSave = async () => {
    if (!form || !schedule || !canSave) return;

    setSaving(true);
    try {
      const startIso = `${form.startDate}T${form.startTime}:00`;
      const endIso = form.endDate && form.endTime ? `${form.endDate}T${form.endTime}:00` : null;
      const reminderMinutes = Number(form.reminder) || 15;
      const remindAt = new Date(
        new Date(startIso).getTime() - reminderMinutes * 60000,
      ).toISOString();
      await updateSchedule(id, {
        title: form.title,
        description: form.description || null,
        item_type: form.type,
        start_time: new Date(startIso).toISOString(),
        end_time: endIso ? new Date(endIso).toISOString() : null,
        priority: form.priority,
        remind_at: remindAt,
        recurrence_type: form.recurrence || 'none',
      });

      const originalTags = uniqueNormalizedTags(schedule.tags?.map((tag) => tag.name || '') ?? []);
      const nextTags = uniqueNormalizedTags(form.tags);
      const removedTags = originalTags.filter((tag) => !nextTags.includes(tag));
      const addedTags = nextTags.filter((tag) => !originalTags.includes(tag));

      if (removedTags.length > 0) {
        await Promise.all(removedTags.map((tag) => detachTag(id, tag)));
      }
      if (addedTags.length > 0) {
        const result = await attachTags(id, addedTags);
        if (result.invalid.length > 0) {
          throw new Error('Invalid tags');
        }
      }

      showToast('Cập nhật thành công!', 'success');
      router.refresh();
      router.push(`/lich/${id}`);
    } catch {
      showToast('Không thể cập nhật. Vui lòng thử lại.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !schedule || !form) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center text-on-surface-variant">
        Đang tải dữ liệu...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-primary font-bold uppercase tracking-wider">
            Chỉnh sửa sự kiện
          </p>
          <h1 className="text-2xl font-bold text-on-surface mt-1">{schedule.title}</h1>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/lich/${id}`}
            className="px-5 py-2.5 border border-outline-variant rounded-xl text-on-surface font-medium text-sm hover:bg-surface-container transition-colors"
          >
            Hủy
          </Link>
          <button
            type="button"
            disabled={!canSave}
            onClick={handleSave}
            className="px-5 py-2.5 bg-primary text-on-primary rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm mb-6">
        <div className="grid grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: statusColors[schedule.status] + '20' }}
            >
              <svg
                className="w-4 h-4"
                style={{ color: statusColors[schedule.status] }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant uppercase font-semibold">Trạng thái</p>
              <p className="text-sm font-medium text-on-surface">{statusLabels[schedule.status]}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant uppercase font-semibold">
                Nhắc gần nhất
              </p>
              <p className="text-sm font-medium text-on-surface">Lúc 08:45</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l1.657-1.657"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant uppercase font-semibold">Định kỳ</p>
              <p className="text-sm font-medium text-on-surface">
                {schedule.recurrence_type === 'weekly'
                  ? 'Hàng tuần'
                  : schedule.recurrence_type === 'daily'
                    ? 'Hàng ngày'
                    : schedule.recurrence_type === 'monthly'
                      ? 'Hàng tháng'
                      : 'Không'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant uppercase font-semibold">Chia sẻ</p>
              <p className="text-sm font-medium text-on-surface">0 người</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-8">
        {/* Basic Info */}
        <h2 className="text-lg font-semibold text-on-surface mb-5">Thông tin cơ bản</h2>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Loại sự kiện</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}
              className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {scheduleTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Tiêu đề</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Mô tả</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>

        {/* Time */}
        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-5">Thời gian thực hiện</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Ngày bắt đầu</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Giờ bắt đầu</label>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Ngày kết thúc</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Giờ kết thúc</label>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Advanced */}
        <h2 className="text-lg font-semibold text-on-surface mt-8 mb-5">Tùy chọn nâng cao</h2>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-3">Mức độ ưu tiên</label>
            <div className="flex gap-2">
              {schedulePriorityOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setForm({ ...form, priority: option.value })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    form.priority === option.value
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">
              Thời gian nhắc nhở
            </label>
            <select
              value={form.reminder}
              onChange={(e) => setForm({ ...form, reminder: e.target.value })}
              className="w-full px-4 py-3 border border-outline-variant rounded-xl text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="5">5 phút trước khi bắt đầu</option>
              <option value="10">10 phút trước khi bắt đầu</option>
              <option value="15">15 phút trước khi bắt đầu</option>
              <option value="30">30 phút trước khi bắt đầu</option>
              <option value="60">1 giờ trước khi bắt đầu</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {form.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium flex items-center gap-1"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, tags: form.tags.filter((t) => t !== tag) })}
                    aria-label={`Gỡ tag ${tag}`}
                    className="ml-1 hover:text-error"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
              {addingTag ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                      if (e.key === 'Escape') {
                        setAddingTag(false);
                        setTagDraft('');
                      }
                    }}
                    autoFocus
                    maxLength={60}
                    placeholder="vd: cong-viec"
                    className="min-w-44 px-3 py-1.5 border border-outline-variant rounded-full text-sm text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-1.5 bg-primary text-on-primary rounded-full text-sm font-medium hover:bg-primary/90"
                  >
                    Thêm
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingTag(false);
                      setTagDraft('');
                    }}
                    className="px-3 py-1.5 text-on-surface-variant rounded-full text-sm font-medium hover:bg-surface-container"
                  >
                    Hủy
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingTag(true)}
                  className="px-3 py-1.5 text-primary border border-primary/30 rounded-full text-sm font-medium hover:bg-primary/5"
                >
                  + Thêm tag
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-surface-container-high">
          <Link
            href={`/lich/${id}`}
            className="px-6 py-3 border border-outline-variant rounded-xl text-on-surface font-medium hover:bg-surface-container transition-colors"
          >
            Hủy
          </Link>
          <button
            type="button"
            disabled={!canSave}
            onClick={handleSave}
            className="px-6 py-3 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}
