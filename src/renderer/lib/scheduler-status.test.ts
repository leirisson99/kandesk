import { describe, expect, it } from 'vitest';
import type { SchedulerStatus } from '@shared/types/system';
import { describeSchedulerStatus } from './scheduler-status';

const base: SchedulerStatus = {
  running: true,
  activeAutomations: 2,
  nextRunAt: '2026-11-09T15:00:00.000Z',
  lastError: null,
};

describe('describeSchedulerStatus', () => {
  it('ativo, com a próxima execução no fuso informado', () => {
    const view = describeSchedulerStatus(base, 'America/Sao_Paulo');
    expect(view).toMatchObject({ tone: 'success', label: 'Agendador ativo' });
    expect(view.detail).toContain('Seg, 9 nov · 12:00');
  });

  it('sem automações ativas', () => {
    expect(
      describeSchedulerStatus({ ...base, activeAutomations: 0, nextRunAt: null }),
    ).toMatchObject({
      tone: 'neutral',
      label: 'Sem automações ativas',
    });
  });

  it('erro tem prioridade sobre ativo, e parado sobre tudo', () => {
    expect(describeSchedulerStatus({ ...base, lastError: 'falhou' })).toMatchObject({
      tone: 'warning',
      label: 'Erro no agendador',
    });
    expect(describeSchedulerStatus({ ...base, running: false, lastError: 'x' })).toMatchObject({
      tone: 'danger',
      label: 'Agendador parado',
    });
  });
});
