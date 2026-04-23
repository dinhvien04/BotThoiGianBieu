import { Test, TestingModule } from '@nestjs/testing';
import { HelpCommand } from '../../src/bot/commands/help.command';
import { CommandRegistry } from '../../src/bot/commands/command-registry';
import { MessageFormatter } from '../../src/shared/utils/message-formatter';
import { CommandContext } from '../../src/bot/commands/command.types';
import { COMMAND_CATALOG, CATEGORY_ORDER } from '../../src/bot/commands/command-catalog';

describe('HelpCommand', () => {
  let command: HelpCommand;
  let mockRegistry: jest.Mocked<CommandRegistry>;
  let mockFormatter: jest.Mocked<MessageFormatter>;

  beforeEach(async () => {
    // Create mocks
    mockRegistry = {
      register: jest.fn(),
      resolve: jest.fn(),
    } as any;

    mockFormatter = {
      formatHelp: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HelpCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: MessageFormatter, useValue: mockFormatter },
      ],
    }).compile();

    command = module.get<HelpCommand>(HelpCommand);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct command metadata', () => {
      expect(command.name).toBe('help');
      expect(command.aliases).toEqual(['huong-dan', 'trogiup']);
      expect(command.description).toBe('Xem hướng dẫn');
      expect(command.category).toBe('❓ Hỗ trợ');
      expect(command.syntax).toBe('help');
    });
  });

  describe('onModuleInit', () => {
    it('should register itself with the registry', () => {
      // Act
      command.onModuleInit();

      // Assert
      expect(mockRegistry.register).toHaveBeenCalledWith(command);
      expect(mockRegistry.register).toHaveBeenCalledTimes(1);
    });
  });

  describe('execute', () => {
    let mockContext: CommandContext;

    beforeEach(() => {
      mockContext = {
        message: {
          message_id: 'msg123',
          channel_id: 'channel123',
          clan_id: 'clan123',
          sender_id: 'user123',
          username: 'testuser',
        },
        rawArgs: '',
        prefix: '*',
        args: [],
        reply: jest.fn(),
        send: jest.fn(),
        sendDM: jest.fn(),
      };
    });

    it('should format and send help message with all commands', async () => {
      // Arrange
      const expectedMessage = '🗓️ BOT THỜI GIAN BIỂU - DANH SÁCH LỆNH 🗓️\n\n...';
      mockFormatter.formatHelp.mockReturnValue(expectedMessage);
      
      // Mock some commands as implemented
      mockRegistry.resolve.mockImplementation((name: string) => {
        if (['bat-dau', 'help', 'them-lich'].includes(name)) {
          return {} as any; // Return a command object
        }
        return undefined; // Not implemented
      });

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockFormatter.formatHelp).toHaveBeenCalledTimes(1);
      
      const [entries, categoryOrder, prefix] = mockFormatter.formatHelp.mock.calls[0];
      
      // Verify entries structure
      expect(entries).toHaveLength(COMMAND_CATALOG.length);
      expect(entries[0]).toHaveProperty('syntax');
      expect(entries[0]).toHaveProperty('description');
      expect(entries[0]).toHaveProperty('category');
      expect(entries[0]).toHaveProperty('implemented');
      
      // Verify category order
      expect(categoryOrder).toEqual(CATEGORY_ORDER);
      
      // Verify prefix
      expect(prefix).toBe('*');
      
      // Verify reply was called
      expect(mockContext.reply).toHaveBeenCalledWith(expectedMessage);
    });

    it('should mark implemented commands correctly', async () => {
      // Arrange
      mockFormatter.formatHelp.mockReturnValue('help message');
      
      // Mock only 'bat-dau' and 'help' as implemented
      mockRegistry.resolve.mockImplementation((name: string) => {
        return name === 'bat-dau' || name === 'help' ? ({} as any) : undefined;
      });

      // Act
      await command.execute(mockContext);

      // Assert
      const entries = mockFormatter.formatHelp.mock.calls[0][0];
      
      // Find bat-dau entry
      const batDauEntry = entries.find((e: any) => e.syntax === 'batdau');
      expect(batDauEntry?.implemented).toBe(true);
      
      // Find help entry
      const helpEntry = entries.find((e: any) => e.syntax === 'help');
      expect(helpEntry?.implemented).toBe(true);
      
      // Find unimplemented entry
      const lichNgayEntry = entries.find((e: any) => e.syntax === 'lich-ngay');
      expect(lichNgayEntry?.implemented).toBe(false);
    });

    it('should use correct prefix from context', async () => {
      // Arrange
      mockFormatter.formatHelp.mockReturnValue('help message');
      mockRegistry.resolve.mockReturnValue(undefined);
      mockContext.prefix = '!'; // Different prefix

      // Act
      await command.execute(mockContext);

      // Assert
      const prefix = mockFormatter.formatHelp.mock.calls[0][2];
      expect(prefix).toBe('!');
    });

    it('should include all catalog entries in help', async () => {
      // Arrange
      mockFormatter.formatHelp.mockReturnValue('help message');
      mockRegistry.resolve.mockReturnValue(undefined);

      // Act
      await command.execute(mockContext);

      // Assert
      const entries = mockFormatter.formatHelp.mock.calls[0][0];
      
      // Verify all catalog entries are included
      expect(entries).toHaveLength(COMMAND_CATALOG.length);
      
      // Verify specific entries exist
      const syntaxes = entries.map((e: any) => e.syntax);
      expect(syntaxes).toContain('batdau');
      expect(syntaxes).toContain('them-lich');
      expect(syntaxes).toContain('lich-hom-nay');
      expect(syntaxes).toContain('sua-lich <ID>');
      expect(syntaxes).toContain('xoa-lich <ID>');
      expect(syntaxes).toContain('help');
    });
  });
});
