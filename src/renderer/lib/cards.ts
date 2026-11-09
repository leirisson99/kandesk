import { classifyColumn, isArchiveColumn } from '@shared/domain/kanban-columns';
import type { Task } from '@shared/types/automation';
import type { BadgeTone } from '@/components/ui';

export interface CardFilter {
  query: string;
  column: string | 'ALL';
  sprint: string | 'ALL';
  /** Mostra também as colunas de arquivo mensal (JUNHO, OUTUBRO…). */
  showArchived: boolean;
}

export const EMPTY_CARD_FILTER: CardFilter = {
  query: '',
  column: 'ALL',
  sprint: 'ALL',
  showArchived: false,
};

const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Aplica busca, coluna, sprint e a ocultação dos arquivados. */
export function filterCards(cards: readonly Task[], filter: CardFilter): Task[] {
  const query = fold(filter.query.trim());
  return cards.filter((card) => {
    if (!filter.showArchived && isArchiveColumn(card.column)) return false;
    if (filter.column !== 'ALL' && card.column !== filter.column) return false;
    if (filter.sprint !== 'ALL' && card.projectName !== filter.sprint) return false;
    if (!query) return true;
    return fold(`${card.title} ${card.id} ${card.column} ${card.projectName}`).includes(query);
  });
}

/** Quantos cards os arquivados escondem com o filtro atual (para avisar o usuário). */
export function countHiddenArchived(cards: readonly Task[], filter: CardFilter): number {
  if (filter.showArchived) return 0;
  return cards.filter((card) => isArchiveColumn(card.column)).length;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Há quanto tempo o card está na coluna atual. "—" quando o Kanboard não informou a data. */
export function formatTimeInColumn(movedAt: string | null, now: Date): string {
  if (!movedAt) return '—';
  const elapsed = now.getTime() - new Date(movedAt).getTime();
  if (Number.isNaN(elapsed)) return '—';
  if (elapsed < MINUTE) return 'menos de 1 min';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)} h`;
  const days = Math.floor(elapsed / DAY);
  return days === 1 ? '1 dia' : `${days} dias`;
}

/** Cor do selo da coluna: trabalho em azul, pausado em âmbar, o resto neutro. */
export function columnTone(column: string): BadgeTone {
  const kind = classifyColumn(column);
  if (kind === 'working') return 'info';
  if (kind === 'paused') return 'warning';
  return 'neutral';
}
