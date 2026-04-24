import { Test, TestingModule } from '@nestjs/testing';
import { CommandRegistry } from '../../src/bot/commands/command-registry';
import { BotCommand } from '../../src/bot/commands/command.types';

describe('CommandRegistry', () => {
  let registry: CommandRegistry;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommandRegistry],
    }).compile();

    registry = module.get<CommandRegistry>(CommandRegistry);
  });

  it('should be defined', () => {
    expect(registry).toBeDefined();
  });

  describe('register', () => {
    it('should register a command by name', () => {
      const mockCommand: BotCommand = {
        name: 'test',
        description: 'Test command',
        category: 'Test',
        syntax: 'test',
        execute: jest.fn(),
      };

      registry.register(mockCommand);

      const resolved = registry.resolve('test');
      expect(resolved).toBe(mockCommand);
    });

    it('should register command with aliases', () => {
      const mockCommand: BotCommand = {
        name: 'bat-dau',
        aliases: ['batdau', 'start'],
        description: 'Start command',
        category: 'Init',
        syntax: 'bat-dau',
        execute: jest.fn(),
      };

      registry.register(mockCommand);

      expect(registry.resolve('bat-dau')).toBe(mockCommand);
      expect(registry.resolve('batdau')).toBe(mockCommand);
      expect(registry.resolve('start')).toBe(mockCommand);
    });

    it('should be case-insensitive', () => {
      const mockCommand: BotCommand = {
        name: 'Test',
        description: 'Test command',
        category: 'Test',
        syntax: 'test',
        execute: jest.fn(),
      };

      registry.register(mockCommand);

      expect(registry.resolve('test')).toBe(mockCommand);
      expect(registry.resolve('TEST')).toBe(mockCommand);
      expect(registry.resolve('TeSt')).toBe(mockCommand);
    });

    it('should not register duplicate names', () => {
      const command1: BotCommand = {
        name: 'test',
        description: 'First',
        category: 'Test',
        syntax: 'test',
        execute: jest.fn(),
      };

      const command2: BotCommand = {
        name: 'test',
        description: 'Second',
        category: 'Test',
        syntax: 'test',
        execute: jest.fn(),
      };

      registry.register(command1);
      registry.register(command2);

      // Should keep the first one
      expect(registry.resolve('test')).toBe(command1);
    });

    it('should ignore invalid commands without name', () => {
      const invalidCommand = {
        name: '',
        description: 'No name',
        category: 'Test',
        syntax: 'test',
        execute: jest.fn(),
      } as BotCommand;

      registry.register(invalidCommand);

      expect(registry.getAll()).toHaveLength(0);
    });
  });

  describe('resolve', () => {
    it('should return undefined for non-existent command', () => {
      const resolved = registry.resolve('non-existent');
      expect(resolved).toBeUndefined();
    });

    it('should resolve command by name', () => {
      const mockCommand: BotCommand = {
        name: 'help',
        description: 'Help command',
        category: 'Support',
        syntax: 'help',
        execute: jest.fn(),
      };

      registry.register(mockCommand);

      expect(registry.resolve('help')).toBe(mockCommand);
    });
  });

  describe('getAll', () => {
    it('should return empty array when no commands registered', () => {
      expect(registry.getAll()).toEqual([]);
    });

    it('should return all registered commands', () => {
      const command1: BotCommand = {
        name: 'test1',
        description: 'Test 1',
        category: 'Test',
        syntax: 'test1',
        execute: jest.fn(),
      };

      const command2: BotCommand = {
        name: 'test2',
        description: 'Test 2',
        category: 'Test',
        syntax: 'test2',
        execute: jest.fn(),
      };

      registry.register(command1);
      registry.register(command2);

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all).toContain(command1);
      expect(all).toContain(command2);
    });

    it('should not allow mutation of internal array', () => {
      const command: BotCommand = {
        name: 'test',
        description: 'Test',
        category: 'Test',
        syntax: 'test',
        execute: jest.fn(),
      };

      registry.register(command);

      const all = registry.getAll();
      all.push({} as BotCommand);

      // Internal array should not be affected
      expect(registry.getAll()).toHaveLength(1);
    });
  });
});
