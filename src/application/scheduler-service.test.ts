import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, type Preferences } from '@shared/schemas/preferences';
import type { Automation, ExecutionRecord } from '@shared/types/automation';
import { createOccurrenceExecutor } from './occurrence-executor';
import type {
  AutomationRepository,
  ExecutionRepository,
  SchedulerStateStore,
  TaskActionResult,
  TaskRepository,
} from './ports';
import { SchedulerService } from './scheduler-service';

// Segunda-feira 2026-11-09; São Paulo = UTC−03:00 → 12:00 local = 15:00Z.
const at = (hhmmssZ: string) => new Date(`2026-11-09T${hhmmssZ}Z`);

const baseAutomation: Automation = {
  id: 'a1',
  name: 'Almoço',
  taskId: 'KB-1',
  pauseAt: '12:00',
  resumeAt: '13:00',
  weekdays: [1],
  timezone: 'America/Sao_Paulo',
  enabled: true,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  lastExecutedAt: null,
};

class Harness {
  now = at('14:59:50');
  automations = new Map<string, Automation>();
  history: ExecutionRecord[] = [];
  lastTick: Date | null = null;
  notifications: string[] = [];
  sounds: (string | null)[] = [];
  notificationSound = true;
  notificationTone: Preferences['notificationTone'] = 'chime';
  taskCalls: string[] = [];
  failingTasks = new Set<string>();
  timers: (() => void)[] = [];
  historyEvents = 0;
  statusEvents = 0;
  failExists = new Set<string>();
  errors: unknown[] = [];
  scheduler: SchedulerService;

  constructor() {
    const automations: AutomationRepository = {
      findAll: async () => [...this.automations.values()],
      findById: async (id) => this.automations.get(id) ?? null,
      save: async (a) => void this.automations.set(a.id, a),
      markExecuted: async (id, when) => {
        const a = this.automations.get(id);
        if (a) this.automations.set(id, { ...a, lastExecutedAt: when });
      },
      delete: async (id) => void this.automations.delete(id),
    };
    const executions: ExecutionRepository = {
      findAll: async () => this.history,
      add: async (r) => void this.history.push(r),
      existsFor: async (id, action, scheduledFor) => {
        if (this.failExists.has(id)) throw new Error('banco indisponível');
        return this.history.some(
          (r) => r.automationId === id && r.action === action && r.scheduledFor === scheduledFor,
        );
      },
    };
    const state: SchedulerStateStore = {
      getLastTick: async () => this.lastTick,
      setLastTick: async (d) => void (this.lastTick = d),
    };
    const ok = (message: string): TaskActionResult => ({
      outcome: 'APPLIED',
      message,
      httpStatus: null,
      simulated: true,
    });
    const tasks: TaskRepository = {
      findAll: async () => [],
      findById: async () => null,
      pause: async (id) => {
        this.taskCalls.push(`pause ${id}`);
        if (this.failingTasks.has(id)) throw new Error('API indisponível');
        return ok('Tarefa pausada');
      },
      resume: async (id) => {
        this.taskCalls.push(`resume ${id}`);
        return ok('Tarefa retomada');
      },
    };
    let n = 0;
    const clock = { now: () => this.now };
    const executor = createOccurrenceExecutor({
      tasks,
      automations,
      executions,
      preferences: {
        get: async () => ({
          ...DEFAULT_PREFERENCES,
          notifySuccess: true,
          notificationSound: this.notificationSound,
          notificationTone: this.notificationTone,
        }),
        save: async () => {},
      },
      notifier: {
        show: (nt) => {
          this.notifications.push(nt.title);
          this.sounds.push(nt.sound);
        },
      },
      clock,
      ids: { next: () => `id-${++n}` },
    });
    this.scheduler = new SchedulerService({
      automations,
      executions,
      state,
      executor,
      clock,
      timer: {
        set: (cb) => void this.timers.push(cb),
        clear: () => void (this.timers.length = 0),
      },
      onHistoryChanged: () => void this.historyEvents++,
      onStatusChanged: () => void this.statusEvents++,
      onError: (e) => void this.errors.push(e),
    });
  }

  add(overrides: Partial<Automation> = {}) {
    const a = { ...baseAutomation, ...overrides };
    this.automations.set(a.id, a);
  }

  /** Avança o relógio e dispara o timer armado. */
  async advanceTo(time: Date) {
    this.now = time;
    const fire = this.timers.shift();
    if (!fire) throw new Error('nenhum timer armado');
    fire();
    await this.scheduler.refresh(); // aguarda a fila (idempotente)
  }
}

let h: Harness;
beforeEach(() => {
  h = new Harness();
});

describe('SchedulerService', () => {
  it('executa a ocorrência no horário, registra histórico e notifica', async () => {
    h.add();
    await h.scheduler.start();
    expect(h.history).toHaveLength(0);
    expect(h.timers).toHaveLength(1);

    await h.advanceTo(at('15:00:00'));

    expect(h.taskCalls).toEqual(['pause KB-1']);
    expect(h.history).toHaveLength(1);
    expect(h.history[0]).toMatchObject({
      action: 'PAUSE',
      status: 'SUCCESS',
      simulated: true,
      scheduledFor: '2026-11-09T15:00:00.000Z',
    });
    expect(h.automations.get('a1')?.lastExecutedAt).not.toBeNull();
    expect(h.notifications[0]).toContain('Ação simulada');
    expect(h.historyEvents).toBeGreaterThan(0);
  });

  it('não executa duas vezes a mesma ocorrência', async () => {
    h.add();
    await h.scheduler.start();
    await h.advanceTo(at('15:00:01'));
    await h.scheduler.refresh();
    await h.scheduler.refresh();
    expect(h.history).toHaveLength(1);
    expect(h.taskCalls).toHaveLength(1);
  });

  it('registra como MISSED, sem executar, quando o atraso passa da tolerância (suspensão)', async () => {
    h.add();
    h.lastTick = at('14:59:50');
    h.now = at('15:10:00'); // computador acordou 10 min depois
    await h.scheduler.start();

    expect(h.taskCalls).toEqual([]);
    expect(h.history).toHaveLength(1);
    expect(h.history[0]).toMatchObject({ status: 'MISSED', action: 'PAUSE' });
    expect(h.history[0]?.executedAt).toBe(h.history[0]?.scheduledFor);
  });

  it('na primeira execução (sem estado) não considera nada perdido', async () => {
    h.add();
    h.now = at('15:30:00');
    await h.scheduler.start();
    expect(h.history).toHaveLength(0);
  });

  it('ignora automações desativadas', async () => {
    h.add({ enabled: false });
    h.lastTick = at('14:00:00');
    h.now = at('15:00:05');
    await h.scheduler.start();
    expect(h.history).toHaveLength(0);
  });

  it('não gera ocorrências no passado para uma regra criada ou editada depois delas', async () => {
    h.add({ updatedAt: '2026-11-09T15:30:00.000Z' });
    h.lastTick = at('14:00:00');
    h.now = at('15:31:00');
    await h.scheduler.start();
    expect(h.history).toHaveLength(0);
  });

  it('falha em uma automação vira ERROR e não interrompe as demais', async () => {
    h.add({ id: 'bad', taskId: 'KB-BAD' });
    h.add({ id: 'good', taskId: 'KB-GOOD' });
    h.failingTasks.add('KB-BAD');
    await h.scheduler.start();
    await h.advanceTo(at('15:00:00'));

    const byId = Object.fromEntries(h.history.map((r) => [r.automationId, r]));
    expect(byId.bad).toMatchObject({ status: 'ERROR', message: 'API indisponível' });
    expect(byId.good).toMatchObject({ status: 'SUCCESS' });
  });

  it('nunca dorme mais que o limite e rearma após cada tick', async () => {
    h.add({ weekdays: [] });
    await h.scheduler.start();
    expect(h.timers).toHaveLength(1);
    await h.advanceTo(at('15:00:20'));
    expect(h.timers).toHaveLength(1);
  });

  it('stop cancela o timer e refresh deixa de agir', async () => {
    h.add();
    await h.scheduler.start();
    h.scheduler.stop();
    expect(h.timers).toHaveLength(0);
    h.now = at('15:00:00');
    await h.scheduler.refresh();
    expect(h.history).toHaveLength(0);
  });

  describe('toque das notificações', () => {
    it('toca o toque escolhido nas preferências', async () => {
      h.notificationTone = 'bell';
      h.add();
      await h.scheduler.start();
      await h.advanceTo(at('15:00:00'));
      expect(h.sounds).toEqual(['bell']);
    });

    it('falhas e ocorrências perdidas usam o mesmo toque escolhido', async () => {
      h.notificationTone = 'pulse';
      h.add({ id: 'late' });
      h.lastTick = at('14:59:50');
      h.now = at('15:10:00');
      await h.scheduler.start();
      expect(h.history[0]?.status).toBe('MISSED');
      expect(h.sounds).toEqual(['pulse']);

      h.failingTasks.add('KB-1');
      h.add({ id: 'fails', pauseAt: '12:11' });
      await h.advanceTo(at('15:11:05'));
      expect(h.history.some((r) => r.status === 'ERROR')).toBe(true);
      expect(h.sounds.at(-1)).toBe('pulse');
    });

    it('com o som desligado a notificação sai silenciosa', async () => {
      h.notificationSound = false;
      h.add();
      await h.scheduler.start();
      await h.advanceTo(at('15:00:00'));
      expect(h.notifications).toHaveLength(1);
      expect(h.sounds).toEqual([null]);
    });
  });

  describe('status', () => {
    it('informa execução, automações ativas e próxima ocorrência', async () => {
      h.add();
      h.add({ id: 'off', enabled: false });
      expect(h.scheduler.getStatus().running).toBe(false);
      await h.scheduler.start();
      expect(h.scheduler.getStatus()).toEqual({
        running: true,
        activeAutomations: 1,
        nextRunAt: '2026-11-09T15:00:00.000Z',
        lastError: null,
      });
      expect(h.statusEvents).toBeGreaterThan(0);
    });

    it('só notifica quando o estado muda e informa a parada', async () => {
      h.add({ weekdays: [] });
      await h.scheduler.start();
      const afterStart = h.statusEvents;
      await h.advanceTo(at('15:00:20')); // nada mudou
      expect(h.statusEvents).toBe(afterStart);
      await h.scheduler.stop();
      expect(h.scheduler.getStatus().running).toBe(false);
      expect(h.statusEvents).toBe(afterStart + 1);
    });

    it('registra o erro do tick e o limpa quando um tick conclui sem erros', async () => {
      h.add({ id: 'bad' });
      h.failExists.add('bad');
      h.lastTick = at('14:00:00');
      h.now = at('15:00:01');
      await h.scheduler.start();
      expect(h.scheduler.getStatus().lastError).toBe('banco indisponível');
      expect(h.errors).toHaveLength(1);

      h.failExists.clear();
      await h.advanceTo(at('15:00:30'));
      expect(h.scheduler.getStatus().lastError).toBeNull();
    });
  });
});
