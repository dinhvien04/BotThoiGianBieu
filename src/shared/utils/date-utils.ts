export interface DateRange {
  start: Date;
  end: Date;
}

export function parseVietnameseDate(input: string): Date | null {
  const value = input.trim();
  const match = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(value);
  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function startOfDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  );
}

export function endOfDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

export function dayRange(date: Date): DateRange {
  return {
    start: startOfDay(date),
    end: endOfDay(date),
  };
}

export function addDays(date: Date, days: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

export function weekRange(date: Date): DateRange {
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = addDays(startOfDay(date), diffToMonday);
  const sunday = addDays(monday, 6);

  return {
    start: monday,
    end: endOfDay(sunday),
  };
}

export function formatDateShort(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

export function formatDateNoYear(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

export function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}
