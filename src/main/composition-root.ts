import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { createOccurrenceExecutor } from '@application/occurrence-executor';
import type { Notifier } from '@application/ports';
import { SchedulerService } from '@application/scheduler-service';
import { createUseCases, type UseCases } from '@application/use-cases';
import { openDatabase } from '@infrastructure/database/connection';
import { seedDemoData } from '@infrastructure/database/seed-demo';
import { MockTaskRepository } from '@infrastructure/repositories/mock/mock-task-repository';
import { SqliteAutomationRepository } from '@infrastructure/repositories/sqlite/sqlite-automation-repository';
import { SqliteExecutionRepository } from '@infrastructure/repositories/sqlite/sqlite-execution-repository';
import { SqlitePreferencesRepository } from '@infrastructure/repositories/sqlite/sqlite-preferences-repository';
import { SqliteSchedulerStateStore } from '@infrastructure/repositories/sqlite/sqlite-scheduler-state-store';

export interface Container {
  db: DatabaseSync;
  useCases: UseCases;
  scheduler: SchedulerService;
}

interface PlatformAdapters {
  notifier: Notifier;
  onHistoryChanged: () => void;
  onSchedulerStatusChanged: () => void;
}

/** Único ponto que escolhe as implementações concretas (SQLite, mock, Electron). */
export async function createContainer(
  databasePath: string,
  { notifier, onHistoryChanged, onSchedulerStatusChanged }: PlatformAdapters,
): Promise<Container> {
  const db = openDatabase(databasePath);
  const clock = { now: () => new Date() };
  const ids = { next: () => randomUUID() };
  const automations = new SqliteAutomationRepository(db);
  const executions = new SqliteExecutionRepository(db);
  const preferences = new SqlitePreferencesRepository(db);
  const tasks = new MockTaskRepository();

  await seedDemoData(db, { automations, executions }, clock);

  const scheduler = new SchedulerService({
    automations,
    executions,
    state: new SqliteSchedulerStateStore(db),
    executor: createOccurrenceExecutor({
      tasks,
      automations,
      executions,
      preferences,
      notifier,
      clock,
      ids,
    }),
    clock,
    timer: {
      set: (callback, delayMs) => setTimeout(callback, delayMs),
      clear: (handle) => clearTimeout(handle as NodeJS.Timeout),
    },
    onHistoryChanged,
    onStatusChanged: onSchedulerStatusChanged,
    // Mensagens de erro de domínio/infra; nunca incluem tokens (não existem nesta fase).
    onError: (error) => console.error('Falha no agendador:', error),
  });

  const useCases = createUseCases({
    automations,
    executions,
    preferences,
    tasks,
    clock,
    ids,
    notifier,
    onAutomationsChanged: () => void scheduler.refresh(),
  });

  return { db, useCases, scheduler };
}
