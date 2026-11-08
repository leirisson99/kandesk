import { DEFAULT_PREFERENCES, preferencesSchema } from '@shared/schemas/preferences';
import { ValidationError } from '../errors';
import type {
  AutomationRepository,
  Clock,
  ExecutionRepository,
  IdGenerator,
  Notifier,
  PreferencesRepository,
  TaskRepository,
} from '../ports';
import { createAutomationUseCases } from './automations';
import { createNotificationUseCases } from './notifications';

export interface UseCaseDeps {
  automations: AutomationRepository;
  executions: ExecutionRepository;
  preferences: PreferencesRepository;
  tasks: TaskRepository;
  clock: Clock;
  ids: IdGenerator;
  notifier: Notifier;
  onAutomationsChanged?: () => void;
}

export function createUseCases(deps: UseCaseDeps) {
  return {
    automations: createAutomationUseCases({ ...deps, onChange: deps.onAutomationsChanged }),
    notifications: createNotificationUseCases(deps),
    listTasks: () => deps.tasks.findAll(),
    listExecutions: () => deps.executions.findAll(),
    getPreferences: () => deps.preferences.get(),
    async updatePreferences(patch: unknown) {
      const current = await deps.preferences.get();
      const parsed = preferencesSchema.safeParse({
        ...DEFAULT_PREFERENCES,
        ...current,
        ...(patch as object),
      });
      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map((i) => i.message).join(' '));
      }
      await deps.preferences.save(parsed.data);
      return parsed.data;
    },
  };
}

export type UseCases = ReturnType<typeof createUseCases>;
