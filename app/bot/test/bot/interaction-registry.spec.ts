import { Test, TestingModule } from '@nestjs/testing';
import { InteractionRegistry } from '../../src/bot/interactions/interaction-registry';
import { InteractionHandler } from '../../src/bot/interactions/interaction.types';

describe('InteractionRegistry', () => {
  let registry: InteractionRegistry;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InteractionRegistry],
    }).compile();

    registry = module.get<InteractionRegistry>(InteractionRegistry);
  });

  describe('register', () => {
    it('should register a handler', () => {
      const handler: InteractionHandler = {
        interactionId: 'test',
        handleButton: jest.fn(),
      };

      registry.register(handler);

      const resolved = registry.resolve('test:action');
      expect(resolved).toBeDefined();
      expect(resolved?.handler).toBe(handler);
    });

    it('should ignore handler without interactionId', () => {
      const handler = {
        handleButton: jest.fn(),
      } as any;

      registry.register(handler);

      const resolved = registry.resolve('test');
      expect(resolved).toBeUndefined();
    });

    it('should ignore duplicate interactionId', () => {
      const handler1: InteractionHandler = {
        interactionId: 'test',
        handleButton: jest.fn(),
      };

      const handler2: InteractionHandler = {
        interactionId: 'test',
        handleButton: jest.fn(),
      };

      registry.register(handler1);
      registry.register(handler2);

      const resolved = registry.resolve('test');
      expect(resolved?.handler).toBe(handler1); // First one wins
    });
  });

  describe('resolve', () => {
    it('should resolve handler by button_id prefix', () => {
      const handler: InteractionHandler = {
        interactionId: 'them-lich',
        handleButton: jest.fn(),
      };

      registry.register(handler);

      const resolved = registry.resolve('them-lich:confirm');
      expect(resolved).toBeDefined();
      expect(resolved?.handler).toBe(handler);
      expect(resolved?.action).toBe('confirm');
    });

    it('should extract action from button_id', () => {
      const handler: InteractionHandler = {
        interactionId: 'test',
        handleButton: jest.fn(),
      };

      registry.register(handler);

      const resolved = registry.resolve('test:action:extra');
      expect(resolved?.action).toBe('action:extra');
    });

    it('should handle button_id without separator', () => {
      const handler: InteractionHandler = {
        interactionId: 'test',
        handleButton: jest.fn(),
      };

      registry.register(handler);

      const resolved = registry.resolve('test');
      expect(resolved?.handler).toBe(handler);
      expect(resolved?.action).toBe('');
    });

    it('should return undefined for unregistered handler', () => {
      const resolved = registry.resolve('unknown:action');
      expect(resolved).toBeUndefined();
    });

    it('should handle multiple handlers', () => {
      const handler1: InteractionHandler = {
        interactionId: 'handler1',
        handleButton: jest.fn(),
      };

      const handler2: InteractionHandler = {
        interactionId: 'handler2',
        handleButton: jest.fn(),
      };

      registry.register(handler1);
      registry.register(handler2);

      expect(registry.resolve('handler1:action')?.handler).toBe(handler1);
      expect(registry.resolve('handler2:action')?.handler).toBe(handler2);
    });
  });
});
