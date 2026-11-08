import type { AutomationAction, ExecutionRecord, ExecutionStatus } from '@shared/types/automation';

export interface HistoryFilter {
  automationId: string | 'ALL';
  action: AutomationAction | 'ALL';
  status: ExecutionStatus | 'ALL';
}

export const EMPTY_HISTORY_FILTER: HistoryFilter = {
  automationId: 'ALL',
  action: 'ALL',
  status: 'ALL',
};

export function filterExecutions(
  records: readonly ExecutionRecord[],
  filter: HistoryFilter,
): ExecutionRecord[] {
  return records.filter(
    (r) =>
      (filter.automationId === 'ALL' || r.automationId === filter.automationId) &&
      (filter.action === 'ALL' || r.action === filter.action) &&
      (filter.status === 'ALL' || r.status === filter.status),
  );
}
