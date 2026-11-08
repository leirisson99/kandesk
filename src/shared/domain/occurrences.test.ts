import { describe, expect, it } from 'vitest';
import { listUpcoming, nextOccurrence, occurrencesBetween, type ScheduleRule } from './occurrences';
import { isValidTimeZone, zonedTimeToInstant } from './time-zone';

const sp: ScheduleRule = {
  pauseAt: '12:00',
  resumeAt: '13:00',
  weekdays: [1, 2, 3, 4, 5],
  timezone: 'America/Sao_Paulo', // UTC−03:00, sem horário de verão
};
const iso = (d: Date) => d.toISOString();

describe('time zone', () => {
  it('valida fusos', () => {
    expect(isValidTimeZone('America/Sao_Paulo')).toBe(true);
    expect(isValidTimeZone('Marte/Olympus')).toBe(false);
  });

  it('converte relógio de parede em instante', () => {
    expect(iso(zonedTimeToInstant(2026, 11, 9, 12, 0, 'America/Sao_Paulo'))).toBe(
      '2026-11-09T15:00:00.000Z',
    );
  });

  it('respeita o horário de verão', () => {
    const rule = { ...sp, timezone: 'America/New_York', weekdays: [0, 1, 2, 3, 4, 5, 6] } as const;
    // 2026-03-08: EST (−5) até 02:00; depois EDT (−4).
    const before = nextOccurrence({ ...rule, pauseAt: '09:00' }, new Date('2026-03-07T00:00:00Z'));
    const after = nextOccurrence({ ...rule, pauseAt: '09:00' }, new Date('2026-03-08T12:00:00Z'));
    expect(iso(before!.at)).toBe('2026-03-07T14:00:00.000Z'); // 09:00 EST
    expect(iso(after!.at)).toBe('2026-03-08T13:00:00.000Z'); // 09:00 EDT
  });
});

describe('occurrencesBetween', () => {
  it('lista pausa e retomada nos dias selecionados, em ordem', () => {
    // Sáb 7/11 12:00 (SP) até Ter 10/11 00:00 (SP)
    const result = occurrencesBetween(
      sp,
      new Date('2026-11-07T15:00:00Z'),
      new Date('2026-11-10T03:00:00Z'),
    );
    expect(result.map((o) => `${o.action} ${iso(o.at)}`)).toEqual([
      'PAUSE 2026-11-09T15:00:00.000Z',
      'RESUME 2026-11-09T16:00:00.000Z',
    ]);
  });

  it('exclui o limite inicial e inclui o final', () => {
    const at = new Date('2026-11-09T15:00:00Z');
    expect(occurrencesBetween(sp, at, new Date('2026-11-09T15:30:00Z'))).toHaveLength(0);
    expect(occurrencesBetween(sp, new Date('2026-11-09T14:59:00Z'), at)).toHaveLength(1);
  });

  it('retorna vazio para janela invertida ou sem dias', () => {
    const a = new Date('2026-11-09T00:00:00Z');
    expect(occurrencesBetween(sp, a, a)).toEqual([]);
    expect(
      occurrencesBetween({ ...sp, weekdays: [] }, a, new Date('2026-11-20T00:00:00Z')),
    ).toEqual([]);
  });

  it('usa o dia local do fuso (horário que cruza a meia-noite em UTC)', () => {
    const night = { ...sp, pauseAt: '22:00', resumeAt: '23:00', weekdays: [1] } as const; // segunda 22:00 SP = terça 01:00 UTC
    const next = nextOccurrence(night, new Date('2026-11-09T00:00:00Z'));
    expect(iso(next!.at)).toBe('2026-11-10T01:00:00.000Z');
  });
});

describe('listUpcoming', () => {
  it('mescla várias regras e limita', () => {
    const rules = [sp, { ...sp, pauseAt: '08:00', resumeAt: '09:00' }];
    const result = listUpcoming(rules, new Date('2026-11-09T00:00:00Z'), 3);
    expect(result.map((r) => iso(r.at))).toEqual([
      '2026-11-09T11:00:00.000Z',
      '2026-11-09T12:00:00.000Z',
      '2026-11-09T15:00:00.000Z',
    ]);
  });
});
