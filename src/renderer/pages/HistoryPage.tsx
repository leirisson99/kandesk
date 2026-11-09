import { useMemo, useState } from 'react';
import { DataState } from '@/components/DataState';
import { HistoryFilters } from '@/components/history/HistoryFilters';
import { HistoryTable } from '@/components/history/HistoryTable';
import { PageHeader } from '@/components/ui';
import { useExecutions } from '@/hooks/useExecutions';
import { EMPTY_HISTORY_FILTER, filterExecutions, type HistoryFilter } from '@/lib/history';

export function HistoryPage() {
  const { data, error, loading } = useExecutions();
  const [filter, setFilter] = useState<HistoryFilter>(EMPTY_HISTORY_FILTER);

  const all = useMemo(() => data ?? [], [data]);
  const records = useMemo(() => filterExecutions(all, filter), [all, filter]);
  // Opções vêm do próprio histórico: automações excluídas continuam filtráveis.
  const automations = useMemo(
    () =>
      [...new Map(all.map((r) => [r.automationId, r.automationName])).entries()].map(
        ([id, name]) => ({ id, name }),
      ),
    [all],
  );

  return (
    <>
      <PageHeader
        title="Histórico de execuções"
        description="Cada ocorrência agendada aparece uma única vez."
      />
      <DataState loading={loading} error={error}>
        <HistoryFilters automations={automations} value={filter} onChange={setFilter} />
        <HistoryTable records={records} />
        <p className="mt-3 text-sm text-slate-500">
          Mostrando {records.length} de {all.length} registros
        </p>
      </DataState>
    </>
  );
}
