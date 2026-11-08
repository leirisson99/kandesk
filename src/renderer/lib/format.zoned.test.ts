import { describe, expect, it } from 'vitest';
import { describeInstant } from './format';

describe('describeInstant', () => {
  it('formata no fuso informado, não no do computador', () => {
    const at = new Date('2026-11-09T15:00:00Z');
    expect(describeInstant(at, 'America/Sao_Paulo').full).toBe('Seg, 9 nov · 12:00');
    expect(describeInstant(at, 'UTC').time).toBe('15:00');
  });

  it('usa o dia da semana local (virada de dia)', () => {
    const at = new Date('2026-11-10T01:00:00Z'); // ainda segunda 22:00 em SP
    expect(describeInstant(at, 'America/Sao_Paulo').weekday).toBe('Seg');
  });
});
