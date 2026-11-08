import { nextOccurrence, occurrencesBetween } from '@shared/domain/occurrences';
import type { Automation } from '@shared/types/automation';
import type { SchedulerStatus } from '@shared/types/system';
import type { OccurrenceExecutor } from './occurrence-executor';
import type {
  AutomationRepository,
  Clock,
  ExecutionRepository,
  SchedulerStateStore,
  Timer,
} from './ports';

/** Atraso máximo para ainda executar uma ocorrência; acima disso ela é registrada como MISSED. */
export const GRACE_MS = 2 * 60_000;
/** Janela máxima de retrospecto ao detectar ocorrências perdidas. */
export const MAX_LOOKBACK_MS = 7 * 86_400_000;
/** O timer nunca dorme mais que isso, para notar suspensão e mudanças no relógio. */
export const MAX_SLEEP_MS = 30_000;

interface Deps {
  automations: AutomationRepository;
  executions: ExecutionRepository;
  state: SchedulerStateStore;
  executor: OccurrenceExecutor;
  clock: Clock;
  timer: Timer;
  /** Chamado após registrar histórico (ex.: avisar a interface). */
  onHistoryChanged?: () => void;
  /** Chamado quando o estado exposto por `getStatus()` muda. */
  onStatusChanged?: () => void;
  onError?: (error: unknown) => void;
}

/**
 * Agendador de timer único. As regras persistidas são a fonte de verdade: a cada tick ele
 * recalcula as ocorrências devidas desde o último tick, sem registrar timers por automação.
 */
export class SchedulerService {
  private handle: unknown = null;
  private running = false;
  private queue: Promise<void> = Promise.resolve();
  private activeAutomations = 0;
  private nextRunAt: Date | null = null;
  private lastError: string | null = null;
  private publishedStatus = '';

  constructor(private readonly deps: Deps) {}

  async start(): Promise<void> {
    this.running = true;
    await this.enqueue();
    this.publishStatus();
  }

  getStatus(): SchedulerStatus {
    return {
      running: this.running,
      activeAutomations: this.activeAutomations,
      nextRunAt: this.nextRunAt?.toISOString() ?? null,
      lastError: this.lastError,
    };
  }

  /** Para o agendador e aguarda o tick em andamento terminar (antes de fechar o banco). */
  stop(): Promise<void> {
    this.running = false;
    this.clearTimer();
    this.nextRunAt = null;
    this.publishStatus();
    return this.queue;
  }

  /** Reavalia agora e reprograma o timer (após editar regras, retomar do sleep etc.). */
  refresh(): Promise<void> {
    return this.running ? this.enqueue() : Promise.resolve();
  }

  private enqueue(): Promise<void> {
    this.clearTimer();
    this.queue = this.queue
      .then(() => this.runTick())
      .catch((e) => this.fail(e))
      .finally(() => this.publishStatus());
    return this.queue;
  }

  private fail(error: unknown): void {
    this.lastError = error instanceof Error ? error.message : String(error);
    this.deps.onError?.(error);
  }

  /** Notifica apenas quando o estado realmente mudou (evita eventos a cada tick). */
  private publishStatus(): void {
    const key = JSON.stringify(this.getStatus());
    if (key === this.publishedStatus) return;
    this.publishedStatus = key;
    this.deps.onStatusChanged?.();
  }

  private clearTimer(): void {
    if (this.handle !== null) this.deps.timer.clear(this.handle);
    this.handle = null;
  }

  private async runTick(): Promise<void> {
    const { clock, state, automations } = this.deps;
    const now = clock.now();
    const stored = await state.getLastTick();
    // Sem estado anterior (primeira execução) ou relógio que voltou: nada é considerado perdido.
    const lastTick = stored && stored.getTime() <= now.getTime() ? stored : now;
    const floor = now.getTime() - MAX_LOOKBACK_MS;

    let changed = false;
    let failed = false;
    const all = await automations.findAll();
    for (const automation of all.filter((a) => a.enabled)) {
      try {
        changed = (await this.processAutomation(automation, lastTick, now, floor)) || changed;
      } catch (error) {
        // Uma automação com problema não pode interromper as demais.
        failed = true;
        this.fail(error);
      }
    }

    await state.setLastTick(now);
    if (!failed) this.lastError = null;
    if (changed) this.deps.onHistoryChanged?.();
    if (this.running) this.arm(all, now);
  }

  private async processAutomation(
    automation: Automation,
    lastTick: Date,
    now: Date,
    floor: number,
  ): Promise<boolean> {
    // Criar/editar/reativar não pode "gerar passado": só vale o que veio depois da alteração.
    const since = Math.max(lastTick.getTime(), Date.parse(automation.updatedAt), floor);
    const due = occurrencesBetween(automation, new Date(since), now);

    let changed = false;
    for (const { action, at } of due) {
      const scheduledFor = at.toISOString();
      if (await this.deps.executions.existsFor(automation.id, action, scheduledFor)) continue;

      const lateness = now.getTime() - at.getTime();
      if (lateness <= GRACE_MS) {
        await this.deps.executor.execute(automation, action, at);
      } else {
        await this.deps.executor.missed(
          automation,
          action,
          at,
          'Aplicativo ou computador indisponível no horário; não executada',
        );
      }
      changed = true;
    }
    return changed;
  }

  private arm(automations: Automation[], now: Date): void {
    let delay = MAX_SLEEP_MS;
    const active = automations.filter((a) => a.enabled);
    this.activeAutomations = active.length;
    this.nextRunAt = null;
    for (const automation of active) {
      const next = nextOccurrence(automation, now);
      if (!next) continue;
      if (!this.nextRunAt || next.at < this.nextRunAt) this.nextRunAt = next.at;
      delay = Math.min(delay, Math.max(next.at.getTime() - now.getTime(), 0) + 50);
    }
    this.clearTimer(); // ticks enfileirados em sequência não podem deixar timers órfãos
    this.handle = this.deps.timer.set(() => void this.enqueue(), delay);
  }
}
