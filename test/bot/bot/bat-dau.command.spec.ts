import { Test, TestingModule } from '@nestjs/testing';
import { BatDauCommand } from 'src/bot/commands/bat-dau.command';
import { CommandRegistry } from 'src/bot/commands/command-registry';
import { UsersService } from 'src/users/users.service';
import { MessageFormatter } from 'src/shared/utils/message-formatter';
import { CommandContext } from 'src/bot/commands/command.types';
import { User } from 'src/users/entities/user.entity';
import { UserSettings } from 'src/users/entities/user-settings.entity';

describe('BatDauCommand', () => {
  let command: BatDauCommand;

  const mockUsersService = {
    registerUser: jest.fn(),
  };

  const mockFormatter = {
    formatWelcome: jest.fn(),
  };

  const mockRegistry = {
    register: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatDauCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: MessageFormatter, useValue: mockFormatter },
      ],
    }).compile();

    command = module.get<BatDauCommand>(BatDauCommand);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(command).toBeDefined();
  });

  describe('metadata', () => {
    it('should have correct command metadata', () => {
      expect(command.name).toBe('bat-dau');
      expect(command.aliases).toEqual(['batdau', 'start']);
      expect(command.description).toBe('Khởi tạo tài khoản và cài đặt mặc định');
      expect(command.category).toBe('🆕 Khởi tạo');
      expect(command.syntax).toBe('bat-dau');
      expect(command.example).toBe('bat-dau');
    });
  });

  describe('onModuleInit', () => {
    it('should register itself in registry', () => {
      command.onModuleInit();
      expect(mockRegistry.register).toHaveBeenCalledWith(command);
    });
  });

  describe('execute', () => {
    let mockContext: CommandContext;
    let mockUser: User;
    let mockSettings: UserSettings;

    beforeEach(() => {
      mockContext = {
        message: {
          message_id: '123',
          channel_id: '456',
          sender_id: '789',
          username: 'testuser',
          display_name: 'Test User',
          content: { t: '*bat-dau' },
        },
        args: [],
        rawArgs: '',
        prefix: '*',
        reply: jest.fn(),
        send: jest.fn(),
        sendDM: jest.fn(),
        ephemeralReply: jest.fn(),
      };

      mockUser = {
        user_id: '789',
        username: 'testuser',
        display_name: 'Test User',
        created_at: new Date(),
        updated_at: new Date(),
      } as User;

      mockSettings = {
        user_id: '789',
        timezone: 'Asia/Ho_Chi_Minh',
        default_channel_id: '456',
        default_remind_minutes: 30,
        notify_via_dm: false,
        created_at: new Date(),
        updated_at: new Date(),
      } as UserSettings;
    });

    it('should register new user successfully', async () => {
      mockUsersService.registerUser.mockResolvedValue({
        user: mockUser,
        settings: mockSettings,
        isNew: true,
      });

      mockFormatter.formatWelcome.mockReturnValue('Welcome message');

      await command.execute(mockContext);

      expect(mockUsersService.registerUser).toHaveBeenCalledWith({
        user_id: '789',
        username: 'testuser',
        display_name: 'Test User',
        default_channel_id: '456',
      });

      expect(mockFormatter.formatWelcome).toHaveBeenCalledWith(
        mockUser,
        mockSettings,
        true,
        '*',
      );

      expect(mockContext.reply).toHaveBeenCalledWith('Welcome message');
    });

    it('should handle existing user', async () => {
      mockUsersService.registerUser.mockResolvedValue({
        user: mockUser,
        settings: mockSettings,
        isNew: false,
      });

      mockFormatter.formatWelcome.mockReturnValue('Welcome back message');

      await command.execute(mockContext);

      expect(mockFormatter.formatWelcome).toHaveBeenCalledWith(
        mockUser,
        mockSettings,
        false,
        '*',
      );

      expect(mockContext.reply).toHaveBeenCalledWith('Welcome back message');
    });

    it('should handle user without username', async () => {
      const contextWithoutUsername = {
        ...mockContext,
        message: {
          ...mockContext.message,
          username: undefined,
          display_name: undefined,
        },
      };

      mockUsersService.registerUser.mockResolvedValue({
        user: { ...mockUser, username: null, display_name: null },
        settings: mockSettings,
        isNew: true,
      });

      mockFormatter.formatWelcome.mockReturnValue('Welcome message');

      await command.execute(contextWithoutUsername);

      expect(mockUsersService.registerUser).toHaveBeenCalledWith({
        user_id: '789',
        username: null,
        display_name: null,
        default_channel_id: '456',
      });
    });

    it('should propagate service errors', async () => {
      mockUsersService.registerUser.mockRejectedValue(new Error('Database error'));

      await expect(command.execute(mockContext)).rejects.toThrow('Database error');
    });
  });
});

