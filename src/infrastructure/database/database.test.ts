import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '@shared/schemas/preferences';
import type { Automation, ExecutionRecord } from '@shared/types/automation';
import { SqliteAutomationRepository } from '../repositories/sqlite/sqlite-automation-repository';
import { SqliteExecutionRepository } from '../repositories/sqlite/sqlite-execution-repository';
import { SqliteSchedulerStateStore } from '../repositories/sqlite/sqlite-scheduler-state-store';
import { SqlitePreferencesRepository } from '../repositories/sqlite/sqlite-preferences-repository';
import { MIGRATIONS, runMigrations } from './migrations';
import { seedDemoData } from './seed-demo';

const automation: Automation = {
  id: 'a1',
  name: 'Almoço',
  taskId: 'KB-1',
  pauseAt: '12:00',
  resumeAt: '13:00',
  weekdays: [1, 2, 3],
  timezone: 'America/Sao_Paulo',
  enabled: true,
  createdAt: '2026-11-07T12:00:00.000Z',
  updatedAt: '2026-11-07T12:00:00.000Z',
  lastExecutedAt: null,
};

let db: DatabaseSync;
beforeEach(() => {
  db = new DatabaseSync(':memory:');
  runMigrations(db);
});

describe('migrations', () => {
  it('aplica todas e é idempotente', () => {
    runMigrations(db);
    const row = db.prepare('PRAGMA user_version').get() as { user_version: number };
    expect(row.user_version).toBe(MIGRATIONS.length);
  });

  it('desfaz uma migração que falha', () => {
    const fresh = new DatabaseSync(':memory:');
    expect(() => runMigrations(fresh, ['CREATE TABLE t (a);', 'CREATE TABLE t (a);'])).toThrow(
      /migração 2/,
    );
    const row = fresh.prepare('PRAGMA user_version').get() as { user_version: number };
    expect(row.user_version).toBe(1);
  });
});

describe('SqliteAutomationRepository', () => {
  it('grava, lê, atualiza e exclui', async () => {
    const repo = new SqliteAutomationRepository(db);
    await repo.save(automation);
    expect(await repo.findById('a1')).toEqual(automation);

    await repo.save({ ...automation, name: 'Outro', enabled: false, weekdays: [6] });
    const [found] = await repo.findAll();
    expect(found).toMatchObject({ name: 'Outro', enabled: false, weekdays: [6] });

    await repo.delete('a1');
    expect(await repo.findById('a1')).toBeNull();
  });
});

describe('SqliteExecutionRepository', () => {
  it('lista mais recentes primeiro e preserva campos', async () => {
    const repo = new SqliteExecutionRepository(db);
    const base: ExecutionRecord = {
      id: 'e1',
      automationId: 'a1',
      automationName: 'Almoço',
      taskId: 'KB-1',
      action: 'PAUSE',
      status: 'SUCCESS',
      scheduledFor: '2026-11-07T12:00:00.000Z',
      executedAt: '2026-11-07T12:00:00.000Z',
      httpStatus: 200,
      message: 'ok',
      simulated: true,
    };
    await repo.add(base);
    await repo.add({
      ...base,
      id: 'e2',
      scheduledFor: '2026-11-07T13:00:00.000Z',
      executedAt: '2026-11-07T13:00:00.000Z',
      httpStatus: null,
    });
    const all = await repo.findAll();
    expect(all.map((e) => e.id)).toEqual(['e2', 'e1']);
    expect(all[0]?.httpStatus).toBeNull();
    expect(all[1]?.simulated).toBe(true);
  });
});

describe('ocorrência única', () => {
  it('impede registrar duas vezes a mesma ocorrência e permite consultá-la', async () => {
    const repo = new SqliteExecutionRepository(db);
    const record: ExecutionRecord = {
      id: 'e1',
      automationId: 'a1',
      automationName: 'Almoço',
      taskId: 'KB-1',
      action: 'PAUSE',
      status: 'SUCCESS',
      scheduledFor: '2026-11-09T15:00:00.000Z',
      executedAt: '2026-11-09T15:00:00.100Z',
      httpStatus: null,
      message: 'ok',
      simulated: true,
    };
    expect(await repo.existsFor('a1', 'PAUSE', record.scheduledFor)).toBe(false);
    await repo.add(record);
    expect(await repo.existsFor('a1', 'PAUSE', record.scheduledFor)).toBe(true);
    expect(await repo.existsFor('a1', 'RESUME', record.scheduledFor)).toBe(false);
    await expect(repo.add({ ...record, id: 'e2' })).rejects.toThrow();
  });
});

describe('SqlitePreferencesRepository', () => {
  it('retorna padrões e persiste alterações', async () => {
    const repo = new SqlitePreferencesRepository(db);
    expect(await repo.get()).toEqual(DEFAULT_PREFERENCES);
    await repo.save({ ...DEFAULT_PREFERENCES, notifySuccess: true });
    expect((await repo.get()).notifySuccess).toBe(true);
  });
});

describe('toque nas preferências', () => {
  it('padrão é o chime e um toque desconhecido salvo volta ao padrão', async () => {
    const repo = new SqlitePreferencesRepository(db);
    expect((await repo.get()).notificationTone).toBe('chime');
    await repo.save({ ...DEFAULT_PREFERENCES, notificationTone: 'bell' });
    expect((await repo.get()).notificationTone).toBe('bell');

    db.prepare('UPDATE preferences SET data = ? WHERE id = 1').run(
      JSON.stringify({ ...DEFAULT_PREFERENCES, notificationTone: 'removido' }),
    );
    expect((await repo.get()).notificationTone).toBe('chime');
  });
});

describe('SqliteSchedulerStateStore', () => {
  it('guarda e devolve o último tick', async () => {
    const store = new SqliteSchedulerStateStore(db);
    expect(await store.getLastTick()).toBeNull();
    await store.setLastTick(new Date('2026-11-09T15:00:00.000Z'));
    await store.setLastTick(new Date('2026-11-09T15:01:00.000Z'));
    expect((await store.getLastTick())?.toISOString()).toBe('2026-11-09T15:01:00.000Z');
  });
});

describe('seedDemoData', () => {
  it('semeia uma única vez, marcando o histórico como simulado', async () => {
    const automations = new SqliteAutomationRepository(db);
    const executions = new SqliteExecutionRepository(db);
    const clock = { now: () => new Date('2026-11-07T20:00:00.000Z') };

    await seedDemoData(db, { automations, executions }, clock);
    await automations.delete('demo-a4');
    await seedDemoData(db, { automations, executions }, clock);

    expect(await automations.findAll()).toHaveLength(3);
    const history = await executions.findAll();
    expect(history).toHaveLength(8);
    expect(history.every((e) => e.simulated)).toBe(true);
  });
});
