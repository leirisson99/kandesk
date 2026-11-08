import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from './migrations';

/** Abre (ou cria) o banco, ativa chaves estrangeiras e aplica as migrações pendentes. */
export function openDatabase(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  try {
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    runMigrations(db);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
