// Modelo de domínio. Os campos do Kanban seguem o que foi observado em docs/KANBAN_INVESTIGATION.md.

export type AutomationAction = 'PAUSE' | 'RESUME';

/** 0 = domingo … 6 = sábado (igual a Date#getDay). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ExecutionStatus = 'SUCCESS' | 'SKIPPED' | 'MISSED' | 'ERROR';

export interface Task {
  /** Referência completa no Kanban: `<sprint>/<card>` (ex.: `10526/254132`). */
  id: string;
  title: string;
  /** Nome da coluna do quadro em que o card está (ex.: EM DESENVOLVIMENTO). */
  column: string;
  /** Nome da sprint (projeto) no Kanboard. */
  projectName: string;
  /** Responsável, quando informado. */
  assignee: string | null;
  /** Quando o card entrou na coluna atual (ISO 8601); null se o Kanboard não informou. */
  movedAt: string | null;
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
}
