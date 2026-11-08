import { describe, expect, it } from 'vitest';
import { formatWeekdays } from './format';

describe('formatWeekdays', () => {
  it('resume intervalos contíguos', () =>
    expect(formatWeekdays([1, 2, 3, 4, 5])).toBe('Seg a Sex'));
  it('lista dias isolados', () => expect(formatWeekdays([3, 1])).toBe('Seg, Qua'));
  it('um dia', () => expect(formatWeekdays([6])).toBe('Sáb'));
  it('todos os dias', () => expect(formatWeekdays([0, 1, 2, 3, 4, 5, 6])).toBe('Todos os dias'));
});
