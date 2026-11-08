import { zonedParts } from '@shared/domain/time-zone';
import type { Weekday } from '@shared/types/automation';

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
};

/** "Seg a Sex", "Todos os dias", "Sáb" ou "Seg, Qua". */
export function formatWeekdays(days: readonly Weekday[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 0) return 'Nenhum dia';
  if (sorted.length === 7) return 'Todos os dias';
  const first = sorted[0] as Weekday;
  const last = sorted[sorted.length - 1] as Weekday;
  const contiguous = last - first === sorted.length - 1;
  if (contiguous && sorted.length >= 3) return `${WEEKDAY_SHORT[first]} a ${WEEKDAY_SHORT[last]}`;
  return sorted.map((d) => WEEKDAY_SHORT[d]).join(', ');
}

const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** "07/11 18:00" */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso)).replace(',', '');
}

const MONTH_SHORT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

export interface ZonedLabel {
  /** "12:00" no fuso informado. */
  time: string;
  /** "Seg" no fuso informado. */
  weekday: string;
  /** "Seg, 9 nov · 12:00" */
  full: string;
}

/** Descreve um instante no fuso da automação (não no fuso do computador). */
export function describeInstant(at: Date, timeZone: string): ZonedLabel {
  const p = zonedParts(at, timeZone);
  const weekday =
    WEEKDAY_SHORT[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay() as Weekday];
  const time = `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
  return { time, weekday, full: `${weekday}, ${p.day} ${MONTH_SHORT[p.month - 1]} · ${time}` };
}
