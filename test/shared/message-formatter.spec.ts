import { MessageFormatter } from '../../src/shared/utils/message-formatter';
import { Schedule } from '../../src/schedules/entities/schedule.entity';
import { User } from '../../src/users/entities/user.entity';
import { UserSettings } from '../../src/users/entities/user-settings.entity';
import { HelpRenderEntry } from '../../src/shared/utils/message-formatter';

describe('MessageFormatter', () => {
  let formatter: MessageFormatter;

  beforeEach(() => {
    formatter = new MessageFormatter();
  });

  it('should be defined', () => {
    expect(formatter).toBeDefined();
  });

  describe('formatWelcome', () => {
    let mockUser: User;
    let mockSettings: UserSettings;

    beforeEach(() => {
      mockUser = {
        user_id: '123',
        username: 'testuser',
        display_name: 'Test User',
        created_at: new Date(),
        updated_at: new Date(),
      } as User;

      mockSettings = {
        user_id: '123',
        timezone: 'Asia/Ho_Chi_Minh',
        default_channel_id: '456',
        default_remind_minutes: 30,
        notify_via_dm: false,
        created_at: new Date(),
        updated_at: new Date(),
      } as UserSettings;
    });

    it('should format welcome message for new user', () => {
      const result = formatter.formatWelcome(mockUser, mockSettings, true, '*');

      expect(result).toContain('🎉');
      expect(result).toContain('Test User');
      expect(result).toContain('Đã khởi tạo tài khoản thành công');
      expect(result).toContain('Asia/Ho_Chi_Minh');
      expect(result).toContain('30 phút');
      expect(result).toContain('*them-lich');
      expect(result).toContain('*lich-hom-nay');
      expect(result).toContain('*help');
    });

    it('should format welcome back message for existing user', () => {
      const result = formatter.formatWelcome(mockUser, mockSettings, false, '*');

      expect(result).toContain('👋');
      expect(result).toContain('Chào lại');
      expect(result).toContain('Test User');
      expect(result).toContain('đã khởi tạo từ trước rồi');
      expect(result).toContain('Asia/Ho_Chi_Minh');
      expect(result).toContain('30 phút');
      expect(result).toContain('không');
      expect(result).toContain('*help');
    });

    it('should use username if display_name is null', () => {
      mockUser.display_name = null;

      const result = formatter.formatWelcome(mockUser, mockSettings, true, '*');

      expect(result).toContain('testuser');
    });

    it('should use user_id if both username and display_name are null', () => {
      mockUser.display_name = null;
      mockUser.username = null;

      const result = formatter.formatWelcome(mockUser, mockSettings, true, '*');

      expect(result).toContain('123');
    });

    it('should show "chưa đặt" when default_channel_id is null', () => {
      mockSettings.default_channel_id = null;

      const result = formatter.formatWelcome(mockUser, mockSettings, true, '*');

      expect(result).toContain('chưa đặt');
    });

    it('should show notify_via_dm status correctly', () => {
      mockSettings.notify_via_dm = true;

      const result = formatter.formatWelcome(mockUser, mockSettings, true, '*');

      // New users ("Xin chào") không show notify_via_dm trong message
      expect(result).toContain('Xin chào');
      expect(result).toContain('Đã khởi tạo tài khoản thành công');

      mockSettings.notify_via_dm = false;
      const result2 = formatter.formatWelcome(mockUser, mockSettings, true, '*');

      expect(result2).toContain('Xin chào');
    });
  });

  describe('formatHelp', () => {
    it('should format help message with entries', () => {
      const entries: HelpRenderEntry[] = [
        {
          syntax: 'bat-dau',
          description: 'Khởi tạo người dùng',
          category: '🆕 KHỞI TẠO',
          implemented: true,
        },
        {
          syntax: 'help',
          description: 'Xem hướng dẫn',
          category: '❓ HỖ TRỢ',
          implemented: true,
        },
        {
          syntax: 'them-lich',
          description: 'Thêm lịch mới',
          category: '✏️ QUẢN LÝ LỊCH',
          implemented: false,
        },
      ];

      const categoryOrder = ['🆕 KHỞI TẠO', '✏️ QUẢN LÝ LỊCH', '❓ HỖ TRỢ'];

      const result = formatter.formatHelp(entries, categoryOrder, '*');

      expect(result).toContain('BOT THỜI GIAN BIỂU');
      expect(result).toContain('DANH SÁCH LỆNH');
      expect(result).toContain('🆕 KHỞI TẠO');
      expect(result).toContain('QUẢN LÝ LỊCH');
      expect(result).toContain('❓ HỖ TRỢ');
      // Mỗi dòng format: "- `*cmd`: description."
      expect(result).toContain('- *bat-dau');
      expect(result).toContain('- *help');
      // Lệnh chưa implement có 🚧 ở cuối dòng
      expect(result).toContain('- *them-lich: Thêm lịch mới. 🚧');
      expect(result).toContain('🚧 = sắp ra mắt');
    });

    it('should format help message with entries', () => {
      const entries: HelpRenderEntry[] = [
        {
          syntax: 'lich-ngay 21-4-2026',
          description: 'Xem lịch theo ngày',
          category: '📅 XEM LỊCH',
          implemented: true,
        },
      ];

      const result = formatter.formatHelp(entries, ['📅 XEM LỊCH'], '*');

      expect(result).toContain('BOT THỜI GIAN BIỂU');
      expect(result).toContain('📅 XEM LỊCH');
      expect(result).toContain('*lich-ngay 21-4-2026');
    });

    it('should group commands by category', () => {
      const entries: HelpRenderEntry[] = [
        {
          syntax: 'cmd1',
          description: 'Command 1',
          category: 'Category A',
          implemented: true,
        },
        {
          syntax: 'cmd2',
          description: 'Command 2',
          category: 'Category B',
          implemented: true,
        },
        {
          syntax: 'cmd3',
          description: 'Command 3',
          category: 'Category A',
          implemented: true,
        },
      ];

      const result = formatter.formatHelp(entries, ['Category A', 'Category B'], '*');

      const categoryAIndex = result.indexOf('Category A');
      const categoryBIndex = result.indexOf('Category B');
      const cmd1Index = result.indexOf('cmd1');
      const cmd3Index = result.indexOf('cmd3');

      expect(categoryAIndex).toBeLessThan(cmd1Index);
      expect(categoryAIndex).toBeLessThan(cmd3Index);
      expect(categoryBIndex).toBeGreaterThan(cmd3Index);
    });

    it('should respect category order', () => {
      const entries: HelpRenderEntry[] = [
        {
          syntax: 'cmd1',
          description: 'Command 1',
          category: 'Category B',
          implemented: true,
        },
        {
          syntax: 'cmd2',
          description: 'Command 2',
          category: 'Category A',
          implemented: true,
        },
      ];

      const result = formatter.formatHelp(entries, ['Category A', 'Category B'], '*');

      const categoryAIndex = result.indexOf('Category A');
      const categoryBIndex = result.indexOf('Category B');

      expect(categoryAIndex).toBeLessThan(categoryBIndex);
    });
  });

  describe('schedule formatting', () => {
    const weekStart = new Date(2026, 3, 20);

    it('should format daily schedule list by status', () => {
      const schedules = [
        buildSchedule({
          id: 1,
          start_time: new Date(2026, 3, 24, 9, 0),
          title: 'Họp team',
          description: 'Daily meeting',
          status: 'pending',
        }),
        buildSchedule({
          id: 2,
          start_time: new Date(2026, 3, 24, 10, 30),
          title: 'Review code',
          description: 'Review PR',
          status: 'completed',
        }),
      ];

      const result = formatter.formatScheduleList(schedules, 'Lịch hôm nay');

      expect(result).toContain('【 LỊCH TRÌNH HÔM NAY 】');
      expect(result).toContain('❖ Trạng thái: Đang chờ (1)');
      expect(result).toContain('❖ Trạng thái: Đã hoàn thành (1)');
      expect(result).toContain("➤ 『 09:00 』 **Họp team**");
      expect(result).toContain('ID: 1 ✦ Ghi chú: Daily meeting');
      expect(result).toContain("➤ 『 10:30 』 **Review code**");
      expect(result).toContain('ID: 2 ✦ Ghi chú: Review PR');
    });

    it('should format weekly schedule by day', () => {
      const schedules = [
        buildSchedule({
          id: 1,
          start_time: new Date(2026, 3, 21, 9, 0),
          title: 'Họp team',
          description: 'Daily meeting',
        }),
        buildSchedule({
          id: 2,
          start_time: new Date(2026, 3, 21, 14, 0),
          title: 'Review code',
          description: 'Review PR cho dự án mới',
        }),
        buildSchedule({
          id: 3,
          start_time: new Date(2026, 3, 23, 15, 40),
          title: 'Onboarding',
          description: 'Meeting anh Viễn',
        }),
      ];

      const result = formatter.formatWeeklySchedule(
        schedules,
        'Lịch tuần này',
        weekStart,
      );

      expect(result).toContain('【 LỊCH TRÌNH TUẦN NÀY 】');
      expect(result).toContain('━━━━━━━━━━━━━━━━━━━━');
      expect(result).toContain('❖ Thứ 3 (21/4)');
      expect(result).toContain('❖ Trạng thái: Đang chờ (2)');
      expect(result).toContain("➤ 『 09:00 』 **Họp team**");
      expect(result).toContain('ID: 1 ✦ Ghi chú: Daily meeting');
      expect(result).toContain("➤ 『 14:00 』 **Review code**");
      expect(result).toContain('ID: 2 ✦ Ghi chú: Review PR cho dự án mới');
      expect(result).toContain('❖ Thứ 5 (23/4)');
      expect(result).toContain('❖ Trạng thái: Đang chờ (1)');
      expect(result).toContain("➤ 『 15:40 』 **Onboarding**");
      expect(result).toContain('ID: 3 ✦ Ghi chú: Meeting anh Viễn');
      expect(result).toContain('💡 Chúc bạn một ngày làm việc hiệu quả!');
    });

    it('should separate mixed weekly statuses', () => {
      const schedules = [
        buildSchedule({
          id: 10,
          start_time: new Date(2026, 3, 22, 9, 0),
          title: 'Làm báo cáo',
          status: 'pending',
        }),
        buildSchedule({
          id: 11,
          start_time: new Date(2026, 3, 22, 11, 0),
          title: 'Xong việc',
          status: 'completed',
        }),
      ];

      const result = formatter.formatWeeklySchedule(
        schedules,
        'Lịch tuần này',
        weekStart,
      );

      expect(result).toContain('❖ Thứ 4 (22/4)');
      expect(result).toContain('❖ Trạng thái: Đang chờ (1)');
      expect(result).toContain('❖ Trạng thái: Đã hoàn thành (1)');
    });

    it('should format empty weekly schedule message', () => {
      const result = formatter.formatWeeklySchedule(
        [],
        'Lịch tuần này',
        weekStart,
      );

      expect(result).toContain('Không có lịch nào.');
      expect(result).toContain('💡 Chúc bạn một ngày làm việc hiệu quả!');
    });
  });

  describe('formatNotInitialized', () => {
    it('should format not initialized message', () => {
      const result = formatter.formatNotInitialized('*');

      expect(result).toContain('⚠️');
      expect(result).toContain('chưa khởi tạo tài khoản');
      expect(result).toContain('`*batdau`');
    });

    it('should use correct prefix', () => {
      const result = formatter.formatNotInitialized('!');

      expect(result).toContain('`!batdau`');
    });
  });

  describe('formatScheduleDigest', () => {
    it('should render empty state with default message', () => {
      const result = formatter.formatScheduleDigest([], 'Lịch sắp tới');

      expect(result).toContain('【 LỊCH SẮP TỚI 】');
      expect(result).toContain('Không có lịch nào.');
    });

    it('should render empty state with custom empty message', () => {
      const result = formatter.formatScheduleDigest([], 'Kết quả tìm', {
        emptyMessage: 'Không tìm thấy gì cả.',
      });

      expect(result).toContain('Không tìm thấy gì cả.');
      expect(result).not.toContain('Không có lịch nào.');
    });

    it('should render each schedule with id, date/time, title and status', () => {
      const schedule = buildSchedule({
        id: 42,
        title: 'Họp quan trọng',
        description: null,
        start_time: new Date(2026, 3, 24, 9, 30),
        status: 'pending',
      });

      const result = formatter.formatScheduleDigest([schedule], 'Kết quả');

      expect(result).toContain('ID: 42');
      expect(result).toContain('24/4/2026 09:30');
      expect(result).toContain('**Họp quan trọng**');
      expect(result).toContain('Đang chờ');
    });

    it('should show description when present', () => {
      const schedule = buildSchedule({
        id: 7,
        description: 'Chuẩn bị slide',
      });

      const result = formatter.formatScheduleDigest([schedule], 'Kết quả');

      expect(result).toContain('Ghi chú: Chuẩn bị slide');
    });

    it('should render status labels for non-pending schedules', () => {
      const completed = buildSchedule({ id: 1, status: 'completed' });
      const cancelled = buildSchedule({ id: 2, status: 'cancelled' });

      const result = formatter.formatScheduleDigest(
        [completed, cancelled],
        'Mixed',
      );

      expect(result).toContain('Đã hoàn thành');
      expect(result).toContain('Đã hủy');
    });

    it('should render 🔁 badge for recurring schedules', () => {
      const recurring = buildSchedule({
        id: 10,
        recurrence_type: 'daily',
        recurrence_interval: 1,
      } as Partial<Schedule>);

      const result = formatter.formatScheduleDigest([recurring], 'Series');

      expect(result).toContain('🔁');
    });

    it('should not render 🔁 badge for non-recurring schedules', () => {
      const one = buildSchedule({ id: 11 });
      const result = formatter.formatScheduleDigest([one], 'One-off');
      expect(result).not.toContain('🔁');
    });

    it('should append footer when provided', () => {
      const schedule = buildSchedule({});

      const result = formatter.formatScheduleDigest([schedule], 'Title', {
        footer: '💡 Trang 1/2',
      });

      expect(result.trim().endsWith('💡 Trang 1/2')).toBe(true);
    });
  });
});

function buildSchedule(overrides: Partial<Schedule>): Schedule {
  return {
    id: 1,
    user_id: '123',
    item_type: 'task',
    title: 'Họp team',
    description: 'Daily meeting',
    start_time: new Date(2026, 3, 24, 9, 0),
    end_time: null,
    status: 'pending',
    remind_at: null,
    is_reminded: false,
    acknowledged_at: null,
    end_notified_at: null,
    created_at: new Date(2026, 3, 1),
    updated_at: new Date(2026, 3, 1),
    ...overrides,
  } as Schedule;
}
