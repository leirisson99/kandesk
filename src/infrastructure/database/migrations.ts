import type { DatabaseSync } from 'node:sqlite';

/** Migrações em ordem; a versão aplicada fica em PRAGMA user_version. Nunca edite uma já publicada. */
export const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE automations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    task_id TEXT NOT NULL,
    pause_at TEXT NOT NULL,
    resume_at TEXT NOT NULL,
    weekdays TEXT NOT NULL,
    timezone TEXT NOT NULL,
    enabled INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_executed_at TEXT
  );
  CREATE TABLE executions (
    id TEXT PRIMARY KEY,
    automation_id TEXT NOT NULL,
    automation_name TEXT NOT NULL,
    task_id TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    executed_at TEXT NOT NULL,
    http_status INTEGER,
    message TEXT NOT NULL,
    simulated INTEGER NOT NULL
  );
  CREATE TABLE preferences (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL
  );
  CREATE TABLE app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
  // 2: identifica cada ocorrência agendada; o índice único impede tratá-la duas vezes.
  `
  ALTER TABLE executions ADD COLUMN scheduled_for TEXT;
  UPDATE executions SET scheduled_for = executed_at WHERE scheduled_for IS NULL;
  CREATE UNIQUE INDEX executions_occurrence
    ON executions (automation_id, action, scheduled_for);
  `,
  // 3: remove a carga de demonstração (ids demo-*) e a coluna `simulated`, que deixou de existir
  // porque nenhuma ação é mais simulada.
  `
  DELETE FROM executions WHERE id LIKE 'demo-%';
  DELETE FROM automations WHERE id LIKE 'demo-%';
  DELETE FROM app_meta WHERE key = 'demo_seeded';
  ALTER TABLE executions DROP COLUMN simulated;
  `,
];

export function runMigrations(db: DatabaseSync, migrations: readonly string[] = MIGRATIONS): void {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number };
  for (let version = row.user_version; version < migrations.length; version++) {
    const sql = migrations[version] as string;
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.exec(`PRAGMA user_version = ${version + 1}`);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw new Error(`Falha ao aplicar a migração ${version + 1}`, { cause: error });
    }
  }
}
