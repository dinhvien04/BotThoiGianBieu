import {
  formatPriority,
  parsePriority,
  PRIORITY_OPTIONS,
  priorityBadge,
} from '../../src/shared/utils/priority';
import { extractPriorityFlag } from '../../src/shared/utils/priority-flag';

describe('priority utils', () => {
  describe('PRIORITY_OPTIONS', () => {
    it('should have 3 options ordered low → normal → high', () => {
      expect(PRIORITY_OPTIONS.map((o) => o.value)).toEqual([
        'low',
        'normal',
        'high',
      ]);
    });
  });

  describe('priorityBadge', () => {
    it.each([
      ['high', '🔴'],
      ['normal', '🟡'],
      ['low', '🟢'],
    ])('returns %s badge for %s', (input, expected) => {
      expect(priorityBadge(input as any)).toBe(expected);
    });
  });

  describe('formatPriority', () => {
    it('returns label with emoji', () => {
      expect(formatPriority('high')).toBe('🔴 Cao');
      expect(formatPriority('normal')).toBe('🟡 Vừa');
      expect(formatPriority('low')).toBe('🟢 Thấp');
    });
  });

  describe('parsePriority', () => {
    it.each([
      ['cao', 'high'],
      ['CAO', 'high'],
      ['high', 'high'],
      ['h', 'high'],
      ['vua', 'normal'],
      ['vừa', 'normal'],
      ['normal', 'normal'],
      ['n', 'normal'],
      ['trung-binh', 'normal'],
      ['binh thuong', 'normal'],
      ['thap', 'low'],
      ['thấp', 'low'],
      ['low', 'low'],
      ['l', 'low'],
    ])('parses %s → %s', (input, expected) => {
      expect(parsePriority(input)).toBe(expected);
    });

    it('returns null for invalid input', () => {
      expect(parsePriority('xxx')).toBeNull();
      expect(parsePriority('')).toBeNull();
    });
  });
});

describe('extractPriorityFlag', () => {
  it('returns rest unchanged when no flag', () => {
    expect(extractPriorityFlag(['1', '2'])).toEqual({
      rest: ['1', '2'],
      priority: undefined,
    });
  });

  it('extracts --uutien <val> form', () => {
    expect(extractPriorityFlag(['--uutien', 'cao'])).toEqual({
      rest: [],
      priority: 'high',
    });
  });

  it('extracts --uutien=<val> form', () => {
    expect(extractPriorityFlag(['--uutien=thap'])).toEqual({
      rest: [],
      priority: 'low',
    });
  });

  it('preserves other args around the flag', () => {
    expect(extractPriorityFlag(['2', '--uutien', 'vua', 'extra'])).toEqual({
      rest: ['2', 'extra'],
      priority: 'normal',
    });
  });

  it('accepts --priority alias', () => {
    expect(extractPriorityFlag(['--priority', 'high'])).toEqual({
      rest: [],
      priority: 'high',
    });
  });

  it('returns error when value missing', () => {
    const result = extractPriorityFlag(['--uutien']);
    expect(result.error).toMatch(/c\u1ea7n gi\u00e1 tr\u1ecb/);
  });

  it('returns error when value invalid', () => {
    const result = extractPriorityFlag(['--uutien', 'nope']);
    expect(result.error).toMatch(/kh\u00f4ng h\u1ee3p l\u1ec7/);
  });
});
