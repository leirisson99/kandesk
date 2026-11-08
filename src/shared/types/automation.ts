// Modelo provisório, alinhado ao layout de exemplo e a docs/. Os campos definitivos
// devem respeitar o contrato da API do Kanban quando ele estiver disponível.

export type AutomationAction = 'PAUSE' | 'RESUME';

/** 0 = domingo … 6 = sábado (igual a Date#getDay). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ExecutionStatus = 'SUCCESS' | 'SKIPPED' | 'MISSED' | 'ERROR';

export interface Task {
  id: string;
  title: string;
}

export interface Automation {
  id: string;
  name: string;
  taskId: string;
  /** Horário local no formato HH:mm. */
  pauseAt: string;
  resumeAt: string;
  weekdays: Weekday[];
  timezone: string;
  enabled: boolean;
  /** ISO 8601. */
  createdAt: string;
  updatedAt: string;
  lastExecutedAt: string | null;
}

export interface ExecutionRecord {
  id: string;
  automationId: string;
  /** Snapshots: o histórico permanece legível se a automação for excluída. */
  automationName: string;
  taskId: string;
  action: AutomationAction;
  status: ExecutionStatus;
  /** Instante agendado da ocorrência (ISO 8601); junto de automação+ação, identifica a ocorrência. */
  scheduledFor: string;
  /** Quando o resultado foi registrado/executado (ISO 8601). */
  executedAt: string;
  httpStatus: number | null;
  message: string;
  /** true quando a ação não alterou uma tarefa real (fase mock). */
  simulated: boolean;
}
