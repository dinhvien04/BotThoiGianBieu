import { Test, TestingModule } from '@nestjs/testing';
import { InteractionRouter } from 'src/bot/interactions/interaction-router';
import { InteractionRegistry } from 'src/bot/interactions/interaction-registry';
import { BotService } from 'src/bot/bot.service';
import {
  MezonButtonClickEvent,
  InteractionHandler,
} from 'src/bot/interactions/interaction.types';

describe('InteractionRouter', () => {
  let router: InteractionRouter;
  let mockRegistry: jest.Mocked<InteractionRegistry>;
  let mockBotService: jest.Mocked<BotService>;

  beforeEach(async () => {
    mockRegistry = {
      resolve: jest.fn(),
    } as any;

    mockBotService = {
      sendMessage: jest.fn(),
      replyToMessage: jest.fn(),
      deleteMessage: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InteractionRouter,
        { provide: InteractionRegistry, useValue: mockRegistry },
        { provide: BotService, useValue: mockBotService },
      ],
    }).compile();

    router = module.get<InteractionRouter>(InteractionRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleButton', () => {
    const mockEvent: MezonButtonClickEvent = {
      message_id: 'msg123',
      channel_id: 'channel123',
      button_id: 'test:action',
      sender_id: 'bot123',
      user_id: 'user123',
      extra_data: '{}',
    };

    it('should handle button click successfully', async () => {
      // Arrange
      const mockHandler: InteractionHandler = {
        interactionId: 'test',
        handleButton: jest.fn().mockResolvedValue(undefined),
      };

      mockRegistry.resolve.mockReturnValue({
        handler: mockHandler,
        action: 'action',
      });

      // Act
      await router.handleButton(mockEvent);

      // Assert
      expect(mockRegistry.resolve).toHaveBeenCalledWith('test:action');
      expect(mockHandler.handleButton).toHaveBeenCalledWith(
        expect.objectContaining({
          event: mockEvent,
          action: 'action',
          clickerId: 'user123',
          channelId: 'channel123',
        }),
      );
    });

    it('should ignore click when no handler found', async () => {
      // Arrange
      mockRegistry.resolve.mockReturnValue(undefined);

      // Act
      await router.handleButton(mockEvent);

      // Assert
      expect(mockRegistry.resolve).toHaveBeenCalled();
      // Should not throw
    });

    it('should deduplicate clicks', async () => {
      // Arrange
      const mockHandler: InteractionHandler = {
        interactionId: 'test',
        handleButton: jest.fn().mockResolvedValue(undefined),
      };

      mockRegistry.resolve.mockReturnValue({
        handler: mockHandler,
        action: 'action',
      });

      // Act
      await router.handleButton(mockEvent);
      await router.handleButton(mockEvent); // Duplicate

      // Assert
      expect(mockHandler.handleButton).toHaveBeenCalledTimes(1);
    });

    it('should parse extra_data as JSON', async () => {
      // Arrange
      const eventWithData = {
        ...mockEvent,
        extra_data: '{"field1":"value1","field2":"value2"}',
      };

      const mockHandler: InteractionHandler = {
        interactionId: 'test',
        handleButton: jest.fn().mockResolvedValue(undefined),
      };

      mockRegistry.resolve.mockReturnValue({
        handler: mockHandler,
        action: 'action',
      });

      // Act
      await router.handleButton(eventWithData);

      // Assert
      const ctx = (mockHandler.handleButton as jest.Mock).mock.calls[0][0];
      expect(ctx.formData).toEqual({
        field1: 'value1',
        field2: 'value2',
      });
    });

    it('should handle invalid extra_data gracefully', async () => {
      // Arrange
      const eventWithBadData = {
        ...mockEvent,
        extra_data: 'invalid json',
      };

      const mockHandler: InteractionHandler = {
        interactionId: 'test',
        handleButton: jest.fn().mockResolvedValue(undefined),
      };

      mockRegistry.resolve.mockReturnValue({
        handler: mockHandler,
        action: 'action',
      });

      // Act
      await router.handleButton(eventWithBadData);

      // Assert
      const ctx = (mockHandler.handleButton as jest.Mock).mock.calls[0][0];
      expect(ctx.formData).toEqual({});
    });

    it('should provide context helpers', async () => {
      // Arrange
      const mockHandler: InteractionHandler = {
        interactionId: 'test',
        handleButton: jest.fn().mockResolvedValue(undefined),
      };

      mockRegistry.resolve.mockReturnValue({
        handler: mockHandler,
        action: 'action',
      });

      mockBotService.sendMessage.mockResolvedValue(undefined);
      mockBotService.replyToMessage.mockResolvedValue(undefined);
      mockBotService.deleteMessage.mockResolvedValue(undefined);

      // Act
      await router.handleButton(mockEvent);

      // Assert
      const ctx = (mockHandler.handleButton as jest.Mock).mock.calls[0][0];
      
      await ctx.send('test message');
      expect(mockBotService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ channelId: 'channel123' }),
        'test message',
      );

      await ctx.reply('test reply');
      expect(mockBotService.replyToMessage).toHaveBeenCalledWith(
        'channel123',
        'msg123',
        'test reply',
        expect.objectContaining({ channelId: 'channel123' }),
      );

      await ctx.deleteForm();
      expect(mockBotService.deleteMessage).toHaveBeenCalledWith('channel123', 'msg123');
    });

    it('should handle handler errors gracefully', async () => {
      // Arrange
      const mockHandler: InteractionHandler = {
        interactionId: 'test',
        handleButton: jest.fn().mockRejectedValue(new Error('Handler error')),
      };

      mockRegistry.resolve.mockReturnValue({
        handler: mockHandler,
        action: 'action',
      });

      mockBotService.sendMessage.mockResolvedValue(undefined);

      // Act
      await router.handleButton(mockEvent);

      // Assert
      expect(mockBotService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ channelId: 'channel123' }),
        expect.stringContaining('Handler error'),
      );
    });

    it('should use user_id as clickerId not sender_id', async () => {
      // Arrange
      const mockHandler: InteractionHandler = {
        interactionId: 'test',
        handleButton: jest.fn().mockResolvedValue(undefined),
      };

      mockRegistry.resolve.mockReturnValue({
        handler: mockHandler,
        action: 'action',
      });

      // Act
      await router.handleButton(mockEvent);

      // Assert
      const ctx = (mockHandler.handleButton as jest.Mock).mock.calls[0][0];
      expect(ctx.clickerId).toBe('user123'); // Not 'bot123'
    });
  });
});
