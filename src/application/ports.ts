import type { NotificationTone } from '@shared/constants/notification-tones';
import type { Preferences } from '@shared/schemas/preferences';
import type { Automation, ExecutionRecord, Task } from '@shared/types/automation';

// Contratos dos quais a camada de aplicação depende. As implementações (SQLite, API do Kanban)
// ficam em infrastructure/.

/** Resultado de uma ação sobre uma tarefa. */
export interface TaskActionResult {
  /**
   * APPLIED: o estado mudou. ALREADY_IN_STATE: a tarefa já estava no estado pedido.
   * MANUAL_ACTION_REQUIRED: o app não executa esta ação; o usuário precisa fazê-la (ex.: retomar).
   */
  outcome: 'APPLIED' | 'ALREADY_IN_STATE' | 'MANUAL_ACTION_REQUIRED';
  message: string;
  httpStatus: number | null;
}

export interface TaskRepository {
  /** `refresh: true` ignora qualquer cache da implementação. */
  findAll(options?: { refresh?: boolean }): Promise<Task[]>;
  findById(id: string): Promise<Task | null>;
  /** Lança erro quando a ação não pôde ser realizada. */
  pause(id: string): Promise<TaskActionResult>;
  resume(id: string): Promise<TaskActionResult>;
}

export interface KanbanCredentials {
  username: string;
  token: string;
}

/** Credencial guardada. `displayName` não é segredo; é o nome devolvido pelo Kanban. */
export interface StoredConnection extends KanbanCredentials {
  displayName: string;
}

/** Guarda a credencial de forma segura. Nunca em texto puro nem no SQLite. */
export interface CredentialStore {
  /** Há armazenamento seguro no sistema? Sem ele, `save` deve falhar. */
  isAvailable(): Promise<boolean>;
  load(): Promise<StoredConnection | null>;
  save(connection: StoredConnection): Promise<void>;
  clear(): Promise<void>;
}

export interface KanbanUser {
  id: string;
  username: string;
  name: string;
}

export interface KanbanAuthClient {
  /** Confirma a credencial no Kanban. Lança AuthError ou CommunicationError. */
  verify(credentials: KanbanCredentials): Promise<KanbanUser>;
}

/** Pede à extensão do navegador que execute a pausa e espera o resultado. */
export interface ExtensionGateway {
  /** Lança CommunicationError se a extensão não estiver conectada ou não responder a tempo. */
  pause(ref: string): Promise<TaskActionResult>;
}

/** Estado da ponte com a extensão (somente leitura). */
export interface BridgeMonitor {
  getStatus(): {
    running: boolean;
    port: number | null;
    connected: boolean;
    lastSeenAt: string | null;
    error: string | null;
  };
}

/** Guarda o código de pareamento com a extensão (segredo local; cifrado em disco). */
export interface PairingCodeStore {
  /** Devolve o código salvo, ou cria e salva um novo se ainda não existir. */
  getOrCreate(): Promise<string>;
  /** Gera um novo código e invalida o anterior. */
  regenerate(): Promise<string>;
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
