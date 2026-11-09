import { describe, expect, it } from 'vitest';
import { unixSecondsToIso } from './unix-time';

describe('unixSecondsToIso', () => {
  it('converte texto e número em segundos Unix', () => {
    expect(unixSecondsToIso('1793039219')).toBe('2026-10-26T18:26:59.000Z');
    expect(unixSecondsToIso(1793039219)).toBe('2026-10-26T18:26:59.000Z');
  });

  it.each([null, undefined, '', '0', 0, -5, 'abc', NaN, {}, 1e20])('%s → null', (value) => {
    expect(unixSecondsToIso(value)).toBeNull();
  });
});
