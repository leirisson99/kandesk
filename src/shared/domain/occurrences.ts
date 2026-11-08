import type { AutomationAction, Weekday } from '../types/automation';
import { zonedParts, zonedTimeToInstant } from './time-zone';

/** Parte da automação que define quando ela dispara. */
export interface ScheduleRule {
  pauseAt: string;
  resumeAt: string;
  weekdays: readonly Weekday[];
  timezone: string;
}

export interface Occurrence {
  action: AutomationAction;
  at: Date;
}

const DAY_MS = 86_400_000;

function parseTime(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':');
  return { hour: Number(h), minute: Number(m) };
}

/**
 * Ocorrências com `from < at <= to`, em ordem cronológica. Pausa e retomada disparam nos
 * dias da semana selecionados, no horário local do fuso da regra.
 */
export function occurrencesBetween(rule: ScheduleRule, from: Date, to: Date): Occurrence[] {
  if (to.getTime() <= from.getTime()) return [];

  const start = zonedParts(from, rule.timezone);
  const span = Math.ceil((to.getTime() - from.getTime()) / DAY_MS) + 2;
  const found: Occurrence[] = [];

  for (let i = -1; i <= span; i++) {
    const day = new Date(Date.UTC(start.year, start.month - 1, start.day + i));
    if (!rule.weekdays.includes(day.getUTCDay() as Weekday)) continue;

    const entries: [AutomationAction, string][] = [
      ['PAUSE', rule.pauseAt],
      ['RESUME', rule.resumeAt],
    ];
    for (const [action, time] of entries) {
      const { hour, minute } = parseTime(time);
      const at = zonedTimeToInstant(
        day.getUTCFullYear(),
        day.getUTCMonth() + 1,
        day.getUTCDate(),
        hour,
        minute,
        rule.timezone,
      );
      if (at.getTime() > from.getTime() && at.getTime() <= to.getTime()) found.push({ action, at });
    }
  }

  return found.sort((a, b) => a.at.getTime() - b.at.getTime() || (a.action === 'PAUSE' ? -1 : 1));
}

/** Próxima ocorrência estritamente após `after` (procura até 8 dias à frente). */
export function nextOccurrence(rule: ScheduleRule, after: Date): Occurrence | null {
  const limit = new Date(after.getTime() + 8 * DAY_MS);
  return occurrencesBetween(rule, after, limit)[0] ?? null;
}

export interface UpcomingItem<T> extends Occurrence {
  item: T;
}

/** Próximas ocorrências de várias regras, mescladas e ordenadas. */
export function listUpcoming<T extends ScheduleRule>(
  items: readonly T[],
  after: Date,
  limit: number,
): UpcomingItem<T>[] {
  const limitDate = new Date(after.getTime() + 8 * DAY_MS);
  return items
    .flatMap((item) => occurrencesBetween(item, after, limitDate).map((o) => ({ ...o, item })))
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, limit);
}
