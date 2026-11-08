import type { DatabaseSync } from 'node:sqlite';
import type { AutomationRepository } from '@application/ports';
import { automationSchema } from '@shared/schemas/automation';
import type { Automation } from '@shared/types/automation';

type Row = Record<string, unknown>;

function toAutomation(row: Row): Automation {
  // Dados lidos do disco são externos: validados antes de entrar na aplicação.
  return automationSchema.parse({
    id: row.id,
    name: row.name,
    taskId: row.task_id,
    pauseAt: row.pause_at,
    resumeAt: row.resume_at,
    weekdays: JSON.parse(row.weekdays as string),
    timezone: row.timezone,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastExecutedAt: row.last_executed_at,
  });
}

export class SqliteAutomationRepository implements AutomationRepository {
  constructor(private readonly db: DatabaseSync) {}

  async findAll(): Promise<Automation[]> {
    const rows = this.db.prepare('SELECT * FROM automations ORDER BY created_at, rowid').all();
    return rows.map(toAutomation);
  }

  async findById(id: string): Promise<Automation | null> {
    const row = this.db.prepare('SELECT * FROM automations WHERE id = ?').get(id);
    return row ? toAutomation(row) : null;
  }

  async save(a: Automation): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO automations
           (id, name, task_id, pause_at, resume_at, weekdays, timezone, enabled,
            created_at, updated_at, last_executed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name, task_id = excluded.task_id, pause_at = excluded.pause_at,
           resume_at = excluded.resume_at, weekdays = excluded.weekdays,
           timezone = excluded.timezone, enabled = excluded.enabled,
           updated_at = excluded.updated_at, last_executed_at = excluded.last_executed_at`,
      )
      .run(
        a.id,
        a.name,
        a.taskId,
        a.pauseAt,
        a.resumeAt,
        JSON.stringify(a.weekdays),
        a.timezone,
        a.enabled ? 1 : 0,
        a.createdAt,
        a.updatedAt,
        a.lastExecutedAt,
      );
  }

  async markExecuted(id: string, at: string): Promise<void> {
    this.db.prepare('UPDATE automations SET last_executed_at = ? WHERE id = ?').run(at, id);
  }

  async delete(id: string): Promise<void> {
    this.db.prepare('DELETE FROM automations WHERE id = ?').run(id);
  }
}
