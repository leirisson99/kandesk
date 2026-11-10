import type { Automation, AutomationAction, ExecutionRecord } from '@shared/types/automation';
import type {
  AutomationRepository,
  Clock,
  ExecutionRepository,
  IdGenerator,
  Notifier,
  PreferencesRepository,
  TaskRepository,
} from './ports';

interface Deps {
  tasks: TaskRepository;
  automations: AutomationRepository;
  executions: ExecutionRepository;
  preferences: PreferencesRepository;
  notifier: Notifier;
  clock: Clock;
  ids: IdGenerator;
}

const ACTION_LABEL: Record<AutomationAction, string> = { PAUSE: 'Pausar', RESUME: 'Retomar' };

/** Executa (ou registra como perdida) uma ocorrência agendada, sempre gravando o histórico. */
export function createOccurrenceExecutor(deps: Deps) {
  const { tasks, automations, executions, preferences, notifier, clock, ids } = deps;

  async function record(
    automation: Automation,
    action: AutomationAction,
    scheduledFor: Date,
    result: Pick<ExecutionRecord, 'status' | 'httpStatus' | 'message'>,
    executedAt: Date,
    manualAction = false,
  ): Promise<ExecutionRecord> {
    const entry: ExecutionRecord = {
      id: ids.next(),
      automationId: automation.id,
      automationName: automation.name,
      taskId: automation.taskId,
      action,
      scheduledFor: scheduledFor.toISOString(),
      executedAt: executedAt.toISOString(),
      ...result,
    };
    await executions.add(entry);
    await notify(entry, manualAction);
    return entry;
  }

  async function notify(entry: ExecutionRecord, manualAction: boolean): Promise<void> {
    const prefs = await preferences.get();
    const label = ACTION_LABEL[entry.action];
    const sound = prefs.notificationSound ? prefs.notificationTone : null;

    if (manualAction) {
      // Lembrete de ação manual (ex.: retomar): é o objetivo da ocorrência, então sempre avisa.
      notifier.show({
        title: `Hora de ${label.toLowerCase()} manualmente: ${entry.automationName}`,
        body: `${entry.taskId} · ${entry.message}`,
        sound,
      });
    } else if (entry.status === 'SUCCESS' && prefs.notifySuccess) {
      notifier.show({
        title: `Ação executada: ${entry.automationName}`,
        body: `${label} · ${entry.message}.`,
        sound,
      });
    } else if (entry.status === 'ERROR' && prefs.notifyCommFailure) {
      notifier.show({
        title: `Falha na automação: ${entry.automationName}`,
        body: `${label} · ${entry.message}`,
        sound,
      });
    } else if (entry.status === 'MISSED' && prefs.notifyMissed) {
      notifier.show({
        title: `Ocorrência perdida: ${entry.automationName}`,
        body: `${label} não foi executada (${entry.message}). Confira a tarefa.`,
        sound,
      });
    }
  }

  return {
    /** Ocorrência no horário: chama a ação da tarefa. Falhas viram registro ERROR, nunca exceção. */
    async execute(
      automation: Automation,
      action: AutomationAction,
      scheduledFor: Date,
    ): Promise<ExecutionRecord> {
      const executedAt = clock.now();
      let entry: ExecutionRecord;
      try {
        const result =
          action === 'PAUSE'
            ? await tasks.pause(automation.taskId)
            : await tasks.resume(automation.taskId);
        entry = await record(
          automation,
          action,
          scheduledFor,
          {
            status: result.outcome === 'APPLIED' ? 'SUCCESS' : 'SKIPPED',
            httpStatus: result.httpStatus,
            message: result.message,
          },
          executedAt,
          result.outcome === 'MANUAL_ACTION_REQUIRED',
        );
      } catch (error) {
        entry = await record(
          automation,
          action,
          scheduledFor,
          {
            status: 'ERROR',
            httpStatus: null,
            message: error instanceof Error ? error.message : String(error),
          },
          executedAt,
        );
      }
      await automations.markExecuted(automation.id, executedAt.toISOString());
      return entry;
    },

    /** Ocorrência que passou sem ser executada: política padrão é só registrar e avisar. */
    missed(
      automation: Automation,
      action: AutomationAction,
      scheduledFor: Date,
      reason: string,
    ): Promise<ExecutionRecord> {
      return record(
        automation,
        action,
        scheduledFor,
        { status: 'MISSED', httpStatus: null, message: reason },
        scheduledFor,
      );
    },
  };
}

export type OccurrenceExecutor = ReturnType<typeof createOccurrenceExecutor>;
