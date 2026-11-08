import type { DatabaseSync } from 'node:sqlite';
import type { SchedulerStateStore } from '@application/ports';

const KEY = 'scheduler_last_tick';

export class SqliteSchedulerStateStore implements SchedulerStateStore {
  constructor(private readonly db: DatabaseSync) {}

  async getLastTick(): Promise<Date | null> {
    const row = this.db.prepare('SELECT value FROM app_meta WHERE key = ?').get(KEY);
    if (!row) return null;
    const date = new Date(row.value as string);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  async setLastTick(at: Date): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO app_meta (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run(KEY, at.toISOString());
  }
}
