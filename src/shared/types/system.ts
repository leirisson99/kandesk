export type AppPlatform = 'win32' | 'darwin' | 'linux';

export interface WindowState {
  maximized: boolean;
  fullScreen: boolean;
}

export interface SchedulerStatus {
  /** O agendador foi iniciado e não parado. */
  running: boolean;
  /** Automações ativas consideradas no último tick. */
  activeAutomations: number;
  /** Próxima ocorrência (ISO 8601) entre as automações ativas. */
  nextRunAt: string | null;
  /** Mensagem do erro do último tick, se houve; limpa quando um tick conclui sem erros. */
  lastError: string | null;
}
