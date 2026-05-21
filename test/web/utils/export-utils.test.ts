import {
  parseIcsSchedules,
  schedulesToCsv,
  schedulesToIcs,
} from '../../../app/web/src/lib/export-utils';
import type { Schedule } from '../../../app/web/src/lib/api';

function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: 1,
    user_id: 'user-1',
    item_type: 'task',
    title: 'Planning',
    description: 'Weekly planning',
    start_time: '2026-05-20T02:00:00.000Z',
    end_time: '2026-05-20T03:00:00.000Z',
    status: 'pending',
    priority: 'normal',
    remind_at: null,
    recurrence_type: 'none',
    recurrence_interval: 1,
    recurrence_until: null,
    is_pinned: false,
    is_hidden: false,
    created_at: '2026-05-19T00:00:00.000Z',
    updated_at: '2026-05-19T00:00:00.000Z',
    tags: [],
    ...overrides,
  };
}

describe('export-utils', () => {
  it('prefixes dangerous CSV cells before Excel can evaluate formulas', () => {
    const csv = schedulesToCsv([
      makeSchedule({
        title: '=1+1',
        description: '+cmd',
        tags: [{ id: 1, user_id: 'user-1', name: '@tag', color: null }],
      }),
    ]);

    expect(csv).toContain("'=1+1");
    expect(csv).toContain("'+cmd");
    expect(csv).toContain("'@tag");
  });

  it('exports recurrence, priority, status, and reminders to ICS', () => {
    const ics = schedulesToIcs([
      makeSchedule({
        status: 'completed',
        priority: 'high',
        remind_at: '2026-05-20T01:30:00.000Z',
        recurrence_type: 'weekly',
        recurrence_interval: 2,
        recurrence_until: '2026-06-20T00:00:00.000Z',
      }),
    ]);

    expect(ics).toContain('STATUS:CONFIRMED');
    expect(ics).toContain('X-FOCUSFLOW-STATUS:completed');
    expect(ics).toContain('PRIORITY:1');
    expect(ics).toContain('RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=20260620T000000Z');
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('TRIGGER:-PT30M');
  });

  it('imports ICS recurrence, priority, and alarm without mixing alarm description into the event', () => {
    const rows = parseIcsSchedules(`BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20260520T020000Z
DTEND:20260520T030000Z
SUMMARY:Demo
DESCRIPTION:Main description
PRIORITY:1
X-FOCUSFLOW-STATUS:completed
RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=20260620T000000Z
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Alarm description
TRIGGER:-PT30M
END:VALARM
END:VEVENT
END:VCALENDAR`);

    expect(rows).toEqual([
      {
        title: 'Demo',
        description: 'Main description',
        item_type: 'event',
        start_time: '2026-05-20T02:00:00.000Z',
        end_time: '2026-05-20T03:00:00.000Z',
        status: 'completed',
        priority: 'high',
        remind_at: '2026-05-20T01:30:00.000Z',
        recurrence_type: 'weekly',
        recurrence_interval: 2,
        recurrence_until: '2026-06-20T00:00:00.000Z',
      },
    ]);
  });
});
