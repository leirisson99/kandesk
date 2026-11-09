import { FEATURES } from '@shared/constants/features';
import { KANBAN_BASE_URL } from '@shared/constants/kanban';
import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { createOccurrenceExecutor } from '@application/occurrence-executor';
import type { CredentialStore, Notifier } from '@application/ports';
import { SchedulerService } from '@application/scheduler-service';
import { createUseCases, type UseCases } from '@application/use-cases';
import { openDatabase } from '@infrastructure/database/connection';
import { KanbanAuthApiClient } from '@infrastructure/kanban/kanban-auth-client';
import { KanbanJsonRpcClient } from '@infrastructure/kanban/jsonrpc-client';
import { KanbanTaskRepository } from '@infrastructure/repositories/kanban/kanban-task-repository';
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
  credentials: CredentialStore;
  onHistoryChanged: () => void;
  onSchedulerStatusChanged: () => void;
}

/** Único ponto que escolhe as implementações concretas (SQLite, Kanban, Electron). */
export async function createContainer(
  databasePath: string,
  { notifier, credentials, onHistoryChanged, onSchedulerStatusChanged }: PlatformAdapters,
): Promise<Container> {
  const db = openDatabase(databasePath);
  const clock = { now: () => new Date() };
  const ids = { next: () => randomUUID() };
  const automations = new SqliteAutomationRepository(db);
  const executions = new SqliteExecutionRepository(db);
  const preferences = new SqlitePreferencesRepository(db);
  const kanbanRpc = new KanbanJsonRpcClient({ baseUrl: KANBAN_BASE_URL });
  const kanbanAuth = new KanbanAuthApiClient(kanbanRpc);
  const tasks = new KanbanTaskRepository(kanbanRpc, credentials, kanbanAuth, clock);

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
    pauseSupported: FEATURES.pauseAndResume,
    credentials,
    kanbanAuth,
    onAutomationsChanged: () => void scheduler.refresh(),
  });

  return { db, useCases, scheduler };
}
