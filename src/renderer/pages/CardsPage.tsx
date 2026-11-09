import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Info, RefreshCw } from 'lucide-react';
import type { Task } from '@shared/types/automation';
import { CardFilters } from '@/components/cards/CardFilters';
import { CardsTable } from '@/components/cards/CardsTable';
import { DataState } from '@/components/DataState';
import { Alert, Button, PageHeader } from '@/components/ui';
import { FEATURES } from '@shared/constants/features';
import { useCards } from '@/hooks/useCards';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { useNow } from '@/hooks/useNow';
import { countHiddenArchived, EMPTY_CARD_FILTER, filterCards, type CardFilter } from '@/lib/cards';
import { errorMessage } from '@/lib/errors';

export function CardsPage() {
  const { cards, error, loading, refreshing, refresh } = useCards();
  const connection = useConnectionStatus();
  const navigate = useNavigate();
  const now = useNow(60_000);
  const [filter, setFilter] = useState<CardFilter>(EMPTY_CARD_FILTER);
  const [actionError, setActionError] = useState<string | null>(null);

  const all = useMemo(() => cards ?? [], [cards]);
  const visible = useMemo(() => filterCards(all, filter), [all, filter]);
  const columns = useMemo(() => [...new Set(all.map((c) => c.column))], [all]);
  const sprints = useMemo(() => [...new Set(all.map((c) => c.projectName))], [all]);

  const open = async (card: Task) => {
    try {
      setActionError(null);
      await window.api.openCard(card.id);
    } catch (e) {
      setActionError(errorMessage(e));
    }
  };
  const createAutomation = (card: Task) =>
    navigate(`/automations?select=NEW&task=${encodeURIComponent(card.id)}`);

  const notConnected = connection !== null && !connection.configured;

  return (
    <>
      <PageHeader
        title="Cards"
        description="Cards do Kanban em que você é o responsável, nas sprints ativas."
        actions={
          <Button onClick={() => void refresh()} disabled={loading || refreshing || notConnected}>
            <RefreshCw
              className={`size-4 ${loading || refreshing ? 'animate-spin' : ''}`}
              aria-hidden
            />
            Atualizar
          </Button>
        }
      />

      {notConnected ? (
        <Alert
          tone="info"
          icon={<Info className="size-4 shrink-0" aria-hidden />}
          action={
            <Link to="/settings">
              <Button variant="primary" size="sm">
                Ir para Configurações
              </Button>
            </Link>
          }
        >
          Conecte sua conta do Kanban para listar os seus cards.
        </Alert>
      ) : (
        <>
          {actionError && (
            <div className="mb-5">
              <Alert tone="danger" title="Não foi possível abrir o card">
                {actionError}
              </Alert>
            </div>
          )}
          <DataState loading={loading && cards === null} error={error}>
            <CardFilters
              columns={columns}
              sprints={sprints}
              value={filter}
              hiddenArchived={countHiddenArchived(all, filter)}
              onChange={setFilter}
            />
            <CardsTable
              cards={visible}
              now={now}
              onOpen={(card) => void open(card)}
              onCreateAutomation={FEATURES.pauseAndResume ? createAutomation : undefined}
            />
            <p className="mt-3 text-sm text-slate-500">
              Mostrando {visible.length} de {all.length} cards
            </p>
          </DataState>
        </>
      )}
    </>
  );
}
