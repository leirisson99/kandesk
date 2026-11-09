import type { DatabaseSync } from 'node:sqlite';
import type { ExecutionRepository } from '@application/ports';
import { executionRecordSchema } from '@shared/schemas/automation';
import type { ExecutionRecord } from '@shared/types/automation';

export class SqliteExecutionRepository implements ExecutionRepository {
  constructor(private readonly db: DatabaseSync) {}

  async findAll(): Promise<ExecutionRecord[]> {
    const rows = this.db
      .prepare('SELECT * FROM executions ORDER BY executed_at DESC, rowid DESC')
      .all();
    return rows.map((row) =>
      executionRecordSchema.parse({
        id: row.id,
        automationId: row.automation_id,
        automationName: row.automation_name,
        taskId: row.task_id,
        action: row.action,
        status: row.status,
        scheduledFor: row.scheduled_for,
        executedAt: row.executed_at,
        httpStatus: row.http_status,
        message: row.message,
      }),
    );
  }

  async add(r: ExecutionRecord): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO executions
           (id, automation_id, automation_name, task_id, action, status, scheduled_for,
            executed_at, http_status, message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        r.id,
        r.automationId,
        r.automationName,
        r.taskId,
        r.action,
        r.status,
        r.scheduledFor,
        r.executedAt,
        r.httpStatus,
        r.message,
      );
  }

  async existsFor(automationId: string, action: string, scheduledFor: string): Promise<boolean> {
    const row = this.db
      .prepare(
        'SELECT 1 FROM executions WHERE automation_id = ? AND action = ? AND scheduled_for = ?',
      )
      .get(automationId, action, scheduledFor);
    return row !== undefined;
  }
}
