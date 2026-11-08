// Sem dependências de runtime: o preload (sandbox) importa este arquivo e não pode carregar Zod.

/** Evento main → renderer: o histórico de execuções mudou. */
export const EXECUTIONS_CHANGED_EVENT = 'executions:changed';

/** Evento main → renderer (com payload `WindowState`): a janela foi maximizada/restaurada/etc. */
export const WINDOW_STATE_CHANGED_EVENT = 'window:state-changed';

/** Evento main → renderer: o estado do agendador mudou (buscar de novo via IPC). */
export const SCHEDULER_STATUS_CHANGED_EVENT = 'scheduler:status-changed';
