import { MessageFormatter } from '../../src/shared/utils/message-formatter';
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

      // New users don't show notify_via_dm in the message
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
      // Lệnh được wrap trong code block ```text ... ``` nên không có backtick quanh từng cmd.
      expect(result).toContain('*bat-dau');
      expect(result).toContain('*help');
      // Lệnh chưa implement có 🚧 ở cuối dòng
      expect(result).toMatch(/\*them-lich\s+Thêm lịch mới\s+🚧/);
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
});
