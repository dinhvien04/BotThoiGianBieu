import { ScheduleItemType } from './entities/schedule.entity';

export interface ItemTypeOption {
  label: string;
  value: ScheduleItemType;
}

/** Danh sách loại lịch dùng cho dropdown trong form thêm/sửa. */
export const ITEM_TYPES: ItemTypeOption[] = [
  { label: '📝 Task (công việc)', value: 'task' },
  { label: '👥 Meeting (họp)', value: 'meeting' },
  { label: '🎉 Event (sự kiện)', value: 'event' },
  { label: '🔔 Reminder (nhắc nhở)', value: 'reminder' },
];

export function findItemTypeOption(value: string): ItemTypeOption | undefined {
  return ITEM_TYPES.find((t) => t.value === value);
}

export function isValidItemType(value: string): value is ScheduleItemType {
  return ITEM_TYPES.some((t) => t.value === value);
}
