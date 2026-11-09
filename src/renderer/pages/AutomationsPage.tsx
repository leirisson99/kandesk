import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AutomationInput } from '@shared/schemas/automation';
import type { Automation } from '@shared/types/automation';
import { AutomationForm } from '@/components/automation/AutomationForm';
import { AutomationListItem } from '@/components/automation/AutomationListItem';
import { DataState } from '@/components/DataState';
import { Alert, Button, Input, PageHeader } from '@/components/ui';
import { useAutomations } from '@/hooks/useAutomations';
import { errorMessage } from '@/lib/errors';
import { useTasks } from '@/hooks/useTasks';
import { EVALUATION_NOTICE, FEATURES } from '@shared/constants/features';

const TIMEZONES = ['America/Sao_Paulo', 'America/Manaus', 'UTC'];

const EMPTY_INPUT: AutomationInput = {
  name: '',
  taskId: '',
  pauseAt: '12:00',
  resumeAt: '13:00',
  weekdays: [1, 2, 3, 4, 5],
  timezone: 'America/Sao_Paulo',
  enabled: true,
};

function toInput(a: Automation): AutomationInput {
  const { name, taskId, pauseAt, resumeAt, weekdays, timezone, enabled } = a;
  return { name, taskId, pauseAt, resumeAt, weekdays, timezone, enabled };
}

export function AutomationsPage() {
  const automations = useAutomations();
  const tasks = useTasks();
  // A seleção vive na URL (?select=<id|NEW>) para a busca da barra de título poder abrir uma automação.
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('select');
  const setSelectedId = (id: string | null) =>
    setParams(id ? { select: id } : {}, { replace: true });
  const [query, setQuery] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const list = automations.data ?? [];
  const taskList = tasks.data ?? [];
  // Sem seleção explícita, mostra a primeira; "NEW" abre o formulário vazio.
  const known = selectedId === 'NEW' || list.some((a) => a.id === selectedId);
  const activeId = (known ? selectedId : null) ?? list[0]?.id ?? 'NEW';
  const selected = list.find((a) => a.id === activeId);
  const visible = list.filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase()));

  const taskLabel = (taskId: string) => {
    const task = taskList.find((t) => t.id === taskId);
    return task ? `${task.title} · #${task.id}` : `#${taskId}`;
  };

  const toggle = async (id: string, enabled: boolean) => {
    try {
      setActionError(null);
      await automations.setEnabled(id, enabled);
    } catch (e) {
      setActionError(errorMessage(e));
    }
  };

  const save = async (input: AutomationInput) => {
    if (selected) {
      await automations.update(selected.id, input);
    } else {
      const created = await automations.create(input);
      setSelectedId(created.id);
    }
  };

  const remove = async () => {
    if (!selected) return;
    await automations.remove(selected.id);
    setSelectedId(null);
  };

  return (
    <>
      <PageHeader
        title="Automações"
        description="Regras salvas localmente. O agendador sempre recalcula a partir delas."
        actions={
          <Button
            variant="primary"
            disabled={!FEATURES.pauseAndResume}
            onClick={() => setSelectedId('NEW')}
          >
            + Nova automação
          </Button>
        }
      />
      {!FEATURES.pauseAndResume && (
        <div className="mb-5">
          <Alert tone="warning" title="Versão de avaliação">
            {EVALUATION_NOTICE}
          </Alert>
        </div>
      )}
      <DataState loading={automations.loading} error={automations.error}>
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-5">
          <div className="flex flex-col gap-3">
            <Input
              type="search"
              aria-label="Pesquisar automações"
              placeholder="Pesquisar por nome…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {actionError && (
              <Alert tone="danger" title="Não foi possível alterar a automação">
                {actionError}
              </Alert>
            )}
            <ul className="flex flex-col gap-3">
              {visible.map((a) => (
                <li key={a.id}>
                  <AutomationListItem
                    automation={a}
                    taskLabel={taskLabel(a.taskId)}
                    selected={a.id === activeId}
                    onSelect={() => setSelectedId(a.id)}
                    onToggle={(enabled) => void toggle(a.id, enabled)}
                    canEnable={FEATURES.pauseAndResume}
                  />
                </li>
              ))}
              {visible.length === 0 && (
                <li className="py-6 text-center text-sm text-slate-500">
                  {list.length === 0
                    ? 'Nenhuma automação cadastrada.'
                    : 'Nenhuma automação encontrada.'}
                </li>
              )}
            </ul>
          </div>
          <AutomationForm
            key={activeId}
            title={selected ? 'Editar automação' : 'Nova automação'}
            initial={
              selected ? toInput(selected) : { ...EMPTY_INPUT, taskId: params.get('task') ?? '' }
            }
            tasks={taskList}
            tasksLoading={tasks.loading}
            tasksError={tasks.error}
            timezones={TIMEZONES}
            onSave={save}
            onDelete={selected ? remove : undefined}
            onCancel={() => setSelectedId(null)}
            saveBlockedReason={FEATURES.pauseAndResume ? undefined : EVALUATION_NOTICE}
          />
        </div>
      </DataState>
    </>
  );
}
