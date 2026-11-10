// Leitura do Kanboard pela API: quadros, requisitos e cronômetros.
// Converte o que a API devolve no formato que evaluate() (logic.js) espera.

import { rpc } from './api.js';
import { classifyColumn } from './logic.js';

// Status de requisito "em andamento": 1 = em desenvolvimento, 4 = teste em andamento.
const RUNNING_STATUSES = new Set(['1', '4']);

export const isRunning = (s) =>
  RUNNING_STATUSES.has(String(s.status)) || s.is_timer_started === true;

/** Cards das colunas monitoradas em um getBoard: [{ taskId, title, columnId, columnName, columnKind }]. */
export function boardCandidates(board, cfg) {
  const out = [];
  for (const swimlane of board ?? []) {
    for (const col of swimlane.columns ?? []) {
      const columnKind = classifyColumn(col.title ?? '', cfg);
      if (!columnKind) continue;
      for (const t of col.tasks ?? [])
        out.push({
          taskId: String(t.id),
          title: t.title ?? '',
          columnId: String(col.id),
          columnName: col.title,
          columnKind,
        });
    }
  }
  return out;
}

/**
 * Estado de cronômetros dos cards, em "entradas" sintéticas ({ user, subtaskTitle, start, end }):
 * - requisito em andamento com cronômetro MEU aberto  -> { user: meuNome, end: 0 }
 * - requisito em andamento de outra pessoa            -> { user: "(outro)", end: 0 }
 * - sem ninguém rodando e eu já trabalhei no card     -> entrada fechada minha (marca o card como "meu")
 *
 * cards: [{ taskId }]; me: { id, name }; spentCache: { [taskId]: { at, mine } } (mutado).
 * Retorna Map(taskId -> entries).
 */
export async function loadCardEntries({ creds, cards, me, myName, spentCache, spentTtl, stats }) {
  const result = new Map();
  if (!cards.length) return result;
  const now = Date.now();

  // 1) Requisitos de todos os cards, em um envio
  const subsRes = await rpc(
    creds,
    cards.map((c) => ({ method: 'getAllSubtasks', params: { task_id: Number(c.taskId) } })),
    stats,
  );
  const subsByTask = new Map(cards.map((c, i) => [c.taskId, subsRes[i].result ?? []]));

  // 2) Cronômetro meu nos requisitos em andamento
  const running = [];
  for (const c of cards)
    for (const s of subsByTask.get(c.taskId))
      if (isRunning(s)) running.push({ taskId: c.taskId, s });
  const timers = await rpc(
    creds,
    running.map(({ s }) => ({
      method: 'hasSubtaskTimer',
      params: { subtask_id: Number(s.id), user_id: Number(me.id) },
    })),
    stats,
  );
  const entriesByTask = new Map(cards.map((c) => [c.taskId, []]));
  running.forEach(({ taskId, s }, i) => {
    const mine = timers[i].result === true;
    entriesByTask.get(taskId).push({
      user: mine ? myName : '(outro)',
      subtaskTitle: s.title,
      start: mine && Number(s.timer_start_date) ? Number(s.timer_start_date) * 1000 : now,
      end: 0,
    });
  });

  // 3) Sem ninguém rodando: o card é "meu" se sou responsável por algum requisito ou já lancei tempo nele
  const idle = cards.filter((c) => entriesByTask.get(c.taskId).length === 0);
  const needSpent = [];
  for (const c of idle) {
    const subs = subsByTask.get(c.taskId);
    if (subs.some((s) => String(s.user_id) === String(me.id))) {
      spentCache[c.taskId] = { at: now, mine: true };
    } else if (!spentCache[c.taskId] || now - spentCache[c.taskId].at > spentTtl) {
      for (const s of subs.filter((x) => String(x.type) === '1'))
        needSpent.push({ taskId: c.taskId, s });
    }
  }
  if (needSpent.length) {
    const spent = await rpc(
      creds,
      needSpent.map(({ s }) => ({
        method: 'getSubtaskTimeSpent',
        params: { subtask_id: Number(s.id), user_id: Number(me.id) },
      })),
      stats,
    );
    const mineByTask = new Map();
    needSpent.forEach(({ taskId }, i) => {
      if (Number(spent[i].result) > 0) mineByTask.set(taskId, true);
    });
    for (const taskId of new Set(needSpent.map((n) => n.taskId)))
      spentCache[taskId] = { at: now, mine: mineByTask.get(taskId) === true };
  }
  for (const c of idle)
    if (spentCache[c.taskId]?.mine)
      entriesByTask
        .get(c.taskId)
        .push({ user: myName, subtaskTitle: '(histórico)', start: 1, end: 2 });

  for (const c of cards) result.set(c.taskId, entriesByTask.get(c.taskId));
  return result;
}
