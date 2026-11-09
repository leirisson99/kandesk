import { TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DataState } from '@/components/DataState';
import { RecentExecutions, type RecentExecution } from '@/components/dashboard/RecentExecutions';
import { UpcomingOccurrences, type Occurrence } from '@/components/dashboard/UpcomingOccurrences';
import { Alert, Button, PageHeader, StatCard } from '@/components/ui';
import { FEATURES } from '@shared/constants/features';
import { useAutomations } from '@/hooks/useAutomations';
import { useExecutions } from '@/hooks/useExecutions';
import { useNow } from '@/hooks/useNow';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { useTasks } from '@/hooks/useTasks';
import { listUpcoming } from '@shared/domain/occurrences';
import { describeInstant, formatDateTime } from '@/lib/format';

export function DashboardPage() {
  const automations = useAutomations();
  const executions = useExecutions();
  const tasks = useTasks(); // só enriquece títulos: se falhar, o painel continua útil
  const connection = useConnectionStatus();
  const now = useNow();

  const autos = automations.data ?? [];
  const history = executions.data ?? [];
  const activeCount = autos.filter((a) => a.enabled).length;
  const missedCount = history.filter((x) => x.status === 'MISSED').length;

  const upcoming = listUpcoming(
    autos.filter((a) => a.enabled),
    now,
    4,
  );
  const upcomingItems: Occurrence[] = upcoming.map(({ at, action, item }) => {
    const label = describeInstant(at, item.timezone);
    return {
      id: `${item.id}-${action}-${at.toISOString()}`,
      time: label.time,
      weekday: label.weekday,
      automationName: tasks.data?.find((t) => t.id === item.taskId)?.title ?? item.name,
      timezone: item.timezone,
      action,
    };
  });
  const next = upcomingItems[0];

  const recent: RecentExecution[] = history.slice(0, 5).map((x) => ({
    id: x.id,
    when: formatDateTime(x.executedAt),
    automationName: x.automationName,
    message: x.message,
    status: x.status,
  }));

  return (
    <>
      <PageHeader
        title="Painel"
        description="Resumo da operação"
        actions={
          FEATURES.pauseAndResume ? (
            <Link to="/automations">
              <Button variant="primary">+ Nova automação</Button>
            </Link>
          ) : undefined
        }
      />
      <DataState
        loading={automations.loading || executions.loading}
        error={automations.error ?? executions.error}
      >
        {missedCount > 0 && (
          <div className="mb-5">
            <Alert
              tone="warning"
              icon={<TriangleAlert className="size-5 shrink-0" aria-hidden />}
              title={`${missedCount} ocorrência(s) perdida(s) registrada(s)`}
              action={
                <Link to="/history" className="text-sm font-bold underline">
                  Ver no histórico
                </Link>
              }
            >
              Registradas como MISSED e não executadas automaticamente.
            </Alert>
          </div>
        )}

        <div className="mb-5 grid grid-cols-4 gap-4">
          <StatCard label="Automações ativas" value={activeCount} suffix={`de ${autos.length}`} />
          <StatCard
            label="Próxima ação"
            value={next ? `${next.action === 'PAUSE' ? 'Pausar' : 'Retomar'} · ${next.time}` : '—'}
            caption={next ? `${next.weekday} · ${next.automationName}` : 'Nenhuma automação ativa'}
          />
          <StatCard
            label="Execuções registradas"
            value={history.length}
            caption={`${history.filter((x) => x.status === 'ERROR').length} com falha`}
          />
          <StatCard
            label="API do Kanban"
            value={connection?.configured ? 'Configurada' : 'Não configurada'}
            caption={
              connection?.configured
                ? `Conta ${connection.username}. Pausa real ainda indisponível`
                : 'Informe usuário e token em Configurações'
            }
          />
        </div>

        <div className="grid grid-cols-2 items-start gap-5">
          <UpcomingOccurrences
            items={upcomingItems}
            emptyMessage="Nenhuma ocorrência agendada. Ative uma automação para ver os próximos horários."
          />
          <RecentExecutions items={recent} />
        </div>
      </DataState>
    </>
  );
}
