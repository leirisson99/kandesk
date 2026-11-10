import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '@shared/schemas/preferences';
import type { Automation, ExecutionRecord } from '@shared/types/automation';
import { createOccurrenceExecutor } from './occurrence-executor';
import type { AppNotification, TaskActionResult, TaskRepository } from './ports';

const automation: Automation = {
  id: 'a1',
  name: 'Almoço',
  taskId: '10526/254251',
  pauseAt: '12:00',
  resumeAt: '13:00',
  weekdays: [1, 2, 3, 4, 5],
  timezone: 'America/Sao_Paulo',
  enabled: true,
  createdAt: '2026-11-09T10:00:00.000Z',
  updatedAt: '2026-11-09T10:00:00.000Z',
  lastExecutedAt: null,
};

function setup(resume: TaskActionResult, prefs = DEFAULT_PREFERENCES) {
  const history: ExecutionRecord[] = [];
  const shown: AppNotification[] = [];
  const tasks: TaskRepository = {
    findAll: async () => [],
    findById: async () => null,
    pause: async () => ({ outcome: 'APPLIED', message: 'Pausado', httpStatus: null }),
    resume: async () => resume,
  };
  const executor = createOccurrenceExecutor({
    tasks,
    automations: {
      findAll: async () => [],
      findById: async () => null,
      save: async () => {},
      markExecuted: async () => {},
      delete: async () => {},
    },
    executions: {
      findAll: async () => history,
      add: async (r) => void history.push(r),
      existsFor: async () => false,
    },
    preferences: { get: async () => prefs, save: async () => {} },
    notifier: { show: (n) => void shown.push(n) },
    clock: { now: () => new Date('2026-11-10T16:00:00.000Z') },
    ids: { next: () => 'e1' },
  });
  return { executor, history, shown };
}

describe('retomada manual', () => {
  const manual: TaskActionResult = {
    outcome: 'MANUAL_ACTION_REQUIRED',
    message: 'Retome o cronômetro manualmente no Kanboard.',
    httpStatus: null,
  };

  it('registra como SKIPPED e sempre avisa o usuário, mesmo com avisos de sucesso desligados', async () => {
    const { executor, history, shown } = setup(manual, {
      ...DEFAULT_PREFERENCES,
      notifySuccess: false,
    });
    await executor.execute(automation, 'RESUME', new Date('2026-11-10T16:00:00.000Z'));

    expect(history[0]).toMatchObject({ status: 'SKIPPED', action: 'RESUME' });
    expect(shown).toHaveLength(1);
    expect(shown[0]?.title).toBe('Hora de retomar manualmente: Almoço');
    expect(shown[0]?.body).toContain('10526/254251');
  });

  it('respeita o som das preferências', async () => {
    const { executor, shown } = setup(manual, { ...DEFAULT_PREFERENCES, notificationSound: false });
    await executor.execute(automation, 'RESUME', new Date('2026-11-10T16:00:00.000Z'));
    expect(shown[0]?.sound).toBeNull();
  });

  it('um SKIPPED comum (já estava no estado) continua sem aviso', async () => {
    const { executor, shown } = setup({
      outcome: 'ALREADY_IN_STATE',
      message: 'x',
      httpStatus: null,
    });
    await executor.execute(automation, 'RESUME', new Date('2026-11-10T16:00:00.000Z'));
    expect(shown).toHaveLength(0);
  });
});
