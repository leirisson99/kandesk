import { EVALUATION_NOTICE } from '@shared/constants/features';
import { automationInputSchema, type AutomationInput } from '@shared/schemas/automation';
import type { Automation } from '@shared/types/automation';
import { DomainError, NotFoundError, ValidationError } from '../errors';
import type { AutomationRepository, Clock, IdGenerator, TaskRepository } from '../ports';

interface Deps {
  automations: AutomationRepository;
  tasks: TaskRepository;
  clock: Clock;
  ids: IdGenerator;
  /** Sem a pausa real, criar/editar/ativar automações é bloqueado (versão de avaliação). */
  pauseSupported: boolean;
  /** Notificado após qualquer alteração de regras (ex.: o agendador recalcula). */
  onChange?: () => void;
}

export function createAutomationUseCases({
  automations,
  tasks,
  clock,
  ids,
  pauseSupported,
  onChange,
}: Deps) {
  function requirePauseSupport(): void {
    if (!pauseSupported) throw new DomainError(EVALUATION_NOTICE);
  }

  async function validate(raw: unknown): Promise<AutomationInput> {
    const parsed = automationInputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join(' '));
    }
    if (!(await tasks.findById(parsed.data.taskId))) {
      throw new DomainError(`A tarefa ${parsed.data.taskId} não existe.`);
    }
    return parsed.data;
  }

  async function getOrThrow(id: string): Promise<Automation> {
    const found = await automations.findById(id);
    if (!found) throw new NotFoundError('Automação', id);
    return found;
  }

  return {
    list: () => automations.findAll(),

    async create(raw: unknown): Promise<Automation> {
      requirePauseSupport();
      const input = await validate(raw);
      const now = clock.now().toISOString();
      const automation: Automation = {
        ...input,
        id: ids.next(),
        createdAt: now,
        updatedAt: now,
        lastExecutedAt: null,
      };
      await automations.save(automation);
      onChange?.();
      return automation;
    },

    async update(id: string, raw: unknown): Promise<Automation> {
      requirePauseSupport();
      const existing = await getOrThrow(id);
      const input = await validate(raw);
      const updated: Automation = { ...existing, ...input, updatedAt: clock.now().toISOString() };
      await automations.save(updated);
      onChange?.();
      return updated;
    },

    /** Desativar sempre é permitido; ativar exige a pausa real. */
    async setEnabled(id: string, enabled: boolean): Promise<Automation> {
      if (enabled) requirePauseSupport();
      const existing = await getOrThrow(id);
      const updated: Automation = { ...existing, enabled, updatedAt: clock.now().toISOString() };
      await automations.save(updated);
      onChange?.();
      return updated;
    },

    async remove(id: string): Promise<void> {
      await getOrThrow(id);
      await automations.delete(id);
      onChange?.();
    },
  };
}

export type AutomationUseCases = ReturnType<typeof createAutomationUseCases>;
