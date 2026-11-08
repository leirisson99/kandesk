import type { NotificationTone } from '@shared/constants/notification-tones';
import type { Preferences } from '@shared/schemas/preferences';
import type { Automation, ExecutionRecord, Task } from '@shared/types/automation';

// Contratos dos quais a camada de aplicação depende. As implementações (SQLite, mock,
// futuramente a API do Kanban) ficam em infrastructure/.

/** Resultado de uma ação sobre uma tarefa. */
export interface TaskActionResult {
  /** APPLIED: o estado mudou. ALREADY_IN_STATE: a tarefa já estava no estado pedido. */
  outcome: 'APPLIED' | 'ALREADY_IN_STATE';
  message: string;
  httpStatus: number | null;
  /** true quando nenhuma tarefa real foi alterada (implementação mock). */
  simulated: boolean;
}

export interface TaskRepository {
  findAll(): Promise<Task[]>;
  findById(id: string): Promise<Task | null>;
  /** Lança erro quando a ação não pôde ser realizada. */
  pause(id: string): Promise<TaskActionResult>;
  resume(id: string): Promise<TaskActionResult>;
}

export interface AutomationRepository {
  findAll(): Promise<Automation[]>;
  findById(id: string): Promise<Automation | null>;
  /** Cria ou substitui (upsert) pelo id. */
  save(automation: Automation): Promise<void>;
  /** Atualiza somente `lastExecutedAt`. */
  markExecuted(id: string, at: string): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ExecutionRepository {
  /** Mais recentes primeiro. */
  findAll(): Promise<ExecutionRecord[]>;
  add(record: ExecutionRecord): Promise<void>;
  /** Já existe registro para esta ocorrência? Garante que ela não seja tratada duas vezes. */
  existsFor(automationId: string, action: string, scheduledFor: string): Promise<boolean>;
}

export interface PreferencesRepository {
  get(): Promise<Preferences>;
  save(preferences: Preferences): Promise<void>;
}

/** Guarda até onde o agendador já avaliou ocorrências (base da detecção de perdidas). */
export interface SchedulerStateStore {
  getLastTick(): Promise<Date | null>;
  setLastTick(at: Date): Promise<void>;
}

export interface AppNotification {
  title: string;
  body: string;
  /** Toque a tocar; null = silencioso. */
  sound: NotificationTone | null;
}

export interface Notifier {
  show(notification: AppNotification): void;
}

export interface Clock {
  now(): Date;
}

export interface Timer {
  set(callback: () => void, delayMs: number): unknown;
  clear(handle: unknown): void;
}

export interface IdGenerator {
  next(): string;
}
