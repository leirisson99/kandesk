import { describe, expect, it } from 'vitest';
import type { ExecutionRecord } from '@shared/types/automation';
import { EMPTY_HISTORY_FILTER, filterExecutions } from './history';

const make = (over: Partial<ExecutionRecord>): ExecutionRecord => ({
  id: '1',
  automationId: 'a',
  automationName: 'A',
  taskId: 'KB-1',
  action: 'PAUSE',
  status: 'SUCCESS',
  scheduledFor: '2026-11-07T18:00:00-03:00',
  executedAt: '2026-11-07T18:00:00-03:00',
  httpStatus: 200,
  message: '',
  ...over,
});

describe('filterExecutions', () => {
  const records = [make({ id: '1' }), make({ id: '2', action: 'RESUME', status: 'ERROR' })];

  it('sem filtros retorna tudo', () => {
    expect(filterExecutions(records, EMPTY_HISTORY_FILTER)).toHaveLength(2);
  });

  it('combina ação e status', () => {
    const result = filterExecutions(records, {
      ...EMPTY_HISTORY_FILTER,
      action: 'RESUME',
      status: 'ERROR',
    });
    expect(result.map((r) => r.id)).toEqual(['2']);
  });
});
