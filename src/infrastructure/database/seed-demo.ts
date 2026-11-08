import type { DatabaseSync } from 'node:sqlite';
import type { AutomationRepository, Clock, ExecutionRepository } from '@application/ports';
import type { Automation, ExecutionRecord } from '@shared/types/automation';

const SEED_KEY = 'demo_seeded';
const TZ = 'America/Sao_Paulo';
const HOUR = 3_600_000;

/**
 * Carga inicial de DEMONSTRAÇÃO (uma única vez). Os registros de histórico são marcados
 * como `simulated` e identificáveis pelo id `demo-*`.
 */
export async function seedDemoData(
  db: DatabaseSync,
  repos: { automations: AutomationRepository; executions: ExecutionRepository },
  clock: Clock,
): Promise<void> {
  if (db.prepare('SELECT 1 FROM app_meta WHERE key = ?').get(SEED_KEY)) return;

  const now = clock.now();
  const iso = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * HOUR).toISOString();

  const base = { timezone: TZ, createdAt: iso(72), updatedAt: iso(72), lastExecutedAt: null };
  const automations: Automation[] = [
    {
      ...base,
      id: 'demo-a1',
      name: 'Pausa de almoço — Suporte N2',
      taskId: 'KB-1042',
      pauseAt: '12:00',
      resumeAt: '13:00',
      weekdays: [1, 2, 3, 4, 5],
      enabled: true,
    },
    {
      ...base,
      id: 'demo-a2',
      name: 'Fim do expediente — Contratos',
      taskId: 'KB-2210',
      pauseAt: '18:00',
      resumeAt: '08:00',
      weekdays: [1, 2, 3, 4, 5],
      enabled: true,
    },
    {
      ...base,
      id: 'demo-a3',
      name: 'Plantão de sábado',
      taskId: 'KB-1877',
      pauseAt: '14:00',
      resumeAt: '09:00',
      weekdays: [6],
      enabled: false,
    },
    {
      ...base,
      id: 'demo-a4',
      name: 'Reunião semanal',
      taskId: 'KB-1042',
      pauseAt: '15:00',
      resumeAt: '16:00',
      weekdays: [3],
      enabled: true,
    },
  ];
  const nameOf = (id: string) => automations.find((a) => a.id === id)?.name ?? '';
  const taskOf = (id: string) => automations.find((a) => a.id === id)?.taskId ?? '';

  const exec = (
    n: number,
    automationId: string,
    action: ExecutionRecord['action'],
    status: ExecutionRecord['status'],
    hoursAgo: number,
    httpStatus: number | null,
    message: string,
  ): ExecutionRecord => ({
    id: `demo-e${n}`,
    automationId,
    automationName: nameOf(automationId),
    taskId: taskOf(automationId),
    action,
    status,
    scheduledFor: iso(hoursAgo),
    executedAt: iso(hoursAgo),
    httpStatus,
    message: `${message} (simulado)`,
    simulated: true,
  });

  const executions: ExecutionRecord[] = [
    exec(1, 'demo-a2', 'PAUSE', 'SUCCESS', 3, 200, 'Tarefa pausada'),
    exec(2, 'demo-a1', 'RESUME', 'SKIPPED', 8, 200, 'Estado já era "em andamento"; nada a fazer'),
    exec(3, 'demo-a1', 'PAUSE', 'SUCCESS', 9, 200, 'Tarefa pausada'),
    exec(4, 'demo-a2', 'RESUME', 'SUCCESS', 13, 200, 'Tarefa retomada após 1 nova tentativa'),
    exec(
      5,
      'demo-a3',
      'PAUSE',
      'MISSED',
      27,
      null,
      'Computador suspenso no horário; não executada',
    ),
    exec(6, 'demo-a4', 'RESUME', 'ERROR', 28, null, 'API indisponível após 3 tentativas (timeout)'),
    exec(
      7,
      'demo-a3',
      'RESUME',
      'ERROR',
      37,
      403,
      'Sem permissão para esta tarefa; não será repetida',
    ),
    exec(8, 'demo-a2', 'PAUSE', 'SUCCESS', 51, 200, 'Tarefa pausada'),
  ];

  for (const a of automations) await repos.automations.save(a);
  for (const e of executions) await repos.executions.add(e);
  db.prepare('INSERT INTO app_meta (key, value) VALUES (?, ?)').run(SEED_KEY, now.toISOString());
}
