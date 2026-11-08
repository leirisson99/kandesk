import { useState, type FormEvent } from 'react';
import { automationInputSchema, type AutomationInput } from '@shared/schemas/automation';
import type { Task } from '@shared/types/automation';
import { Alert, Button, Card, CardHeader, FormField, Input, Select, Switch } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { listUpcoming } from '@shared/domain/occurrences';
import { useNow } from '@/hooks/useNow';
import { describeInstant } from '@/lib/format';
import { UpcomingRuns, type UpcomingRun } from './UpcomingRuns';
import { WeekdayPicker } from './WeekdayPicker';

type Errors = Partial<Record<keyof AutomationInput, string>>;

interface AutomationFormProps {
  title: string;
  initial: AutomationInput;
  tasks: Task[];
  timezones: string[];
  onSave: (input: AutomationInput) => Promise<void>;
  /** Presente apenas ao editar uma automação existente. */
  onDelete?: () => Promise<void>;
  onCancel: () => void;
}

export function AutomationForm({
  title,
  initial,
  tasks,
  timezones,
  onSave,
  onDelete,
  onCancel,
}: AutomationFormProps) {
  const [values, setValues] = useState<AutomationInput>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const now = useNow();
  const upcoming = upcomingFor(values, now);

  /** Executa uma operação do Main exibindo o erro no próprio formulário. */
  const run = async (operation: () => Promise<void>) => {
    setBusy(true);
    setSubmitError(null);
    try {
      await operation();
    } catch (e) {
      setSubmitError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const set = <K extends keyof AutomationInput>(key: K, value: AutomationInput[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = automationInputSchema.safeParse(values);
    if (!result.success) {
      const next: Errors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof AutomationInput;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    void run(() => onSave(result.data));
  };

  return (
    <Card>
      <CardHeader
        title={title}
        description="A regra é persistida antes de qualquer timer ser programado."
      />
      <form onSubmit={submit} noValidate className="flex flex-col gap-5 p-5">
        <FormField label="Nome" htmlFor="name" error={errors.name}>
          <Input
            id="name"
            value={values.name}
            aria-invalid={!!errors.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </FormField>

        <FormField
          label="Tarefa no Kanban"
          htmlFor="taskId"
          error={errors.taskId}
          hint="O vínculo é feito pelo ID da tarefa, não pelo título. Lista simulada (demonstração)."
        >
          <Select
            id="taskId"
            value={values.taskId}
            aria-invalid={!!errors.taskId}
            onChange={(e) => set('taskId', e.target.value)}
          >
            <option value="">Selecione…</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title} · #{task.id}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Pausar às" htmlFor="pauseAt" error={errors.pauseAt}>
            <Input
              id="pauseAt"
              type="time"
              value={values.pauseAt}
              aria-invalid={!!errors.pauseAt}
              onChange={(e) => set('pauseAt', e.target.value)}
            />
          </FormField>
          <FormField label="Retomar às" htmlFor="resumeAt" error={errors.resumeAt}>
            <Input
              id="resumeAt"
              type="time"
              value={values.resumeAt}
              aria-invalid={!!errors.resumeAt}
              onChange={(e) => set('resumeAt', e.target.value)}
            />
          </FormField>
        </div>

        <FormField label="Dias da semana" htmlFor="weekdays" error={errors.weekdays}>
          <WeekdayPicker value={values.weekdays} onChange={(d) => set('weekdays', d)} />
        </FormField>

        <FormField label="Fuso horário" htmlFor="timezone" error={errors.timezone}>
          <Select
            id="timezone"
            value={values.timezone}
            onChange={(e) => set('timezone', e.target.value)}
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Automação ativa</p>
          <Switch
            checked={values.enabled}
            onChange={(v) => set('enabled', v)}
            label="Automação ativa"
          />
        </div>

        <UpcomingRuns runs={upcoming} />

        {submitError && (
          <Alert tone="danger" title="Não foi possível salvar">
            {submitError}
          </Alert>
        )}

        <div className="flex items-center justify-between gap-3">
          <div>
            {onDelete &&
              (confirmingDelete ? (
                <div className="flex items-center gap-2">
                  <Button variant="danger" disabled={busy} onClick={() => void run(onDelete)}>
                    Confirmar exclusão
                  </Button>
                  <Button onClick={() => setConfirmingDelete(false)}>Manter</Button>
                </div>
              ) : (
                <Button variant="danger" disabled={busy} onClick={() => setConfirmingDelete(true)}>
                  Excluir
                </Button>
              ))}
          </div>
          <div className="flex gap-3">
            <Button onClick={onCancel}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? 'Salvando…' : 'Salvar automação'}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}

/** Próximas execuções conforme o que está digitado (só se os dados já forem válidos). */
function upcomingFor(values: AutomationInput, now: Date): UpcomingRun[] {
  const parsed = automationInputSchema.safeParse(values);
  if (!parsed.success) return [];
  return listUpcoming([parsed.data], now, 3).map(({ at, action, item }) => ({
    label: describeInstant(at, item.timezone).full,
    action,
  }));
}
