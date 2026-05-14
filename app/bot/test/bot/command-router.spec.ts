import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CommandRouter } from '../../src/bot/commands/command-router';
import { CommandRegistry } from '../../src/bot/commands/command-registry';
import { BotService } from '../../src/bot/bot.service';
import { BotCommand, MezonChannelMessage } from '../../src/bot/commands/command.types';

describe('CommandRouter', () => {
  let router: CommandRouter;
  let registry: CommandRegistry;

  const mockBotService = {
    replyToMessage: jest.fn(),
    sendMessage: jest.fn(),
    sendDirectMessage: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'BOT_PREFIX') return '*';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommandRouter,
        CommandRegistry,
        { provide: BotService, useValue: mockBotService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    router = module.get<CommandRouter>(CommandRouter);
    registry = module.get<CommandRegistry>(CommandRegistry);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(router).toBeDefined();
  });

  describe('getPrefix', () => {
    it('should return configured prefix', () => {
      expect(router.getPrefix()).toBe('*');
    });
  });

  describe('handle', () => {
    it('should ignore messages without prefix', async () => {
      const message: MezonChannelMessage = {
        message_id: '123',
        channel_id: '456',
        sender_id: '789',
        content: { t: 'hello world' },
      };

      await router.handle(message);

      expect(mockBotService.replyToMessage).not.toHaveBeenCalled();
    });

    it('should ignore messages with only prefix', async () => {
      const message: MezonChannelMessage = {
        message_id: '123',
        channel_id: '456',
        sender_id: '789',
        content: { t: '*' },
      };

      await router.handle(message);

      expect(mockBotService.replyToMessage).not.toHaveBeenCalled();
    });

    it('should ignore messages with empty content', async () => {
      const message: MezonChannelMessage = {
        message_id: '123',
        channel_id: '456',
        sender_id: '789',
        content: { t: '' },
      };

      await router.handle(message);

      expect(mockBotService.replyToMessage).not.toHaveBeenCalled();
    });

    it('should ignore non-existent commands', async () => {
      const message: MezonChannelMessage = {
        message_id: '123',
        channel_id: '456',
        sender_id: '789',
        content: { t: '*non-existent' },
      };

      await router.handle(message);

      expect(mockBotService.replyToMessage).not.toHaveBeenCalled();
    });

    it('should execute registered command', async () => {
      const mockExecute = jest.fn();
      const mockCommand: BotCommand = {
        name: 'test',
        description: 'Test',
        category: 'Test',
        syntax: 'test',
        execute: mockExecute,
      };

      registry.register(mockCommand);

      const message: MezonChannelMessage = {
        message_id: '123',
        channel_id: '456',
        sender_id: '789',
        content: { t: '*test' },
      };

      await router.handle(message);

      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          message,
          args: [],
          rawArgs: '',
          prefix: '*',
        }),
      );
    });

    it('should parse command arguments', async () => {
      const mockExecute = jest.fn();
      const mockCommand: BotCommand = {
        name: 'test',
        description: 'Test',
        category: 'Test',
        syntax: 'test <arg1> <arg2>',
        execute: mockExecute,
      };

      registry.register(mockCommand);

      const message: MezonChannelMessage = {
        message_id: '123',
        channel_id: '456',
        sender_id: '789',
        content: { t: '*test arg1 arg2' },
      };

      await router.handle(message);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          args: ['arg1', 'arg2'],
          rawArgs: 'arg1 arg2',
        }),
      );
    });

    it('should handle command errors gracefully', async () => {
      const mockExecute = jest.fn().mockRejectedValue(new Error('Test error'));
      const mockCommand: BotCommand = {
        name: 'test',
        description: 'Test',
        category: 'Test',
        syntax: 'test',
        execute: mockExecute,
      };

      registry.register(mockCommand);

      const message: MezonChannelMessage = {
        message_id: '123',
        channel_id: '456',
        sender_id: '789',
        content: { t: '*test' },
      };

      await router.handle(message);

      // Đổi từ reply sang send (fallback safer khi SDK cache miss)
      expect(mockBotService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ channelId: '456' }),
        '❌ Có lỗi xảy ra: Test error',
      );
    });

    it('should provide context helpers', async () => {
      let capturedContext: any;
      const mockExecute = jest.fn(async (ctx) => {
        capturedContext = ctx;
      });

      const mockCommand: BotCommand = {
        name: 'test',
        description: 'Test',
        category: 'Test',
        syntax: 'test',
        execute: mockExecute,
      };

      registry.register(mockCommand);

      const message: MezonChannelMessage = {
        message_id: '123',
        channel_id: '456',
        sender_id: '789',
        content: { t: '*test' },
      };

      await router.handle(message);

      expect(capturedContext).toBeDefined();
      expect(typeof capturedContext.reply).toBe('function');
      expect(typeof capturedContext.send).toBe('function');
      expect(typeof capturedContext.sendDM).toBe('function');

      // Test reply helper
      await capturedContext.reply('test reply');
      expect(mockBotService.replyToMessage).toHaveBeenCalledWith(
        '456',
        '123',
        'test reply',
        expect.objectContaining({ channelId: '456' }),
      );

      // Test send helper
      await capturedContext.send('test send');
      expect(mockBotService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ channelId: '456' }),
        'test send',
      );

      // Test sendDM helper
      await capturedContext.sendDM('test dm');
      expect(mockBotService.sendDirectMessage).toHaveBeenCalledWith('789', 'test dm');
    });

    it('should handle whitespace in commands', async () => {
      const mockExecute = jest.fn();
      const mockCommand: BotCommand = {
        name: 'test',
        description: 'Test',
        category: 'Test',
        syntax: 'test',
        execute: mockExecute,
      };

      registry.register(mockCommand);

      const message: MezonChannelMessage = {
        message_id: '123',
        channel_id: '456',
        sender_id: '789',
        content: { t: '*  test   arg1   arg2  ' },
      };

      await router.handle(message);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          args: ['arg1', 'arg2'],
        }),
      );
    });
  });
});
