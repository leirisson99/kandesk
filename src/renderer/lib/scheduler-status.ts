import type { SchedulerStatus } from '@shared/types/system';
import { describeInstant } from './format';

export type StatusTone = 'success' | 'neutral' | 'warning' | 'danger';

export interface SchedulerStatusView {
  tone: StatusTone;
  label: string;
  /** Texto de apoio (tooltip). */
  detail: string;
}

export function describeSchedulerStatus(
  status: SchedulerStatus,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): SchedulerStatusView {
  if (!status.running) {
    return {
      tone: 'danger',
      label: 'Agendador parado',
      detail: 'Nenhuma automação será executada.',
    };
  }
  if (status.lastError) {
    return {
      tone: 'warning',
      label: 'Erro no agendador',
      detail: `Último erro: ${status.lastError}. As demais automações seguem ativas.`,
    };
  }
  if (status.activeAutomations === 0) {
    return {
      tone: 'neutral',
      label: 'Sem automações ativas',
      detail: 'O agendador está rodando, mas não há automação ativa.',
    };
  }
  const next = status.nextRunAt
    ? `Próxima execução: ${describeInstant(new Date(status.nextRunAt), timeZone).full}.`
    : 'Nenhuma execução prevista nos próximos dias.';
  return { tone: 'success', label: 'Agendador ativo', detail: next };
}
