import { describe, expect, it } from 'vitest';
import type { Task } from '@shared/types/automation';
import {
  columnTone,
  countHiddenArchived,
  EMPTY_CARD_FILTER,
  filterCards,
  formatTimeInColumn,
} from './cards';

const card = (over: Partial<Task>): Task => ({
  id: '10/1',
  title: 'Integração contábil',
  column: 'EM DESENVOLVIMENTO',
  projectName: 'Humanus',
  assignee: null,
  movedAt: null,
  ...over,
});

const cards = [
  card({}),
  card({ id: '10/2', title: 'Relatório fiscal', column: 'PAUSADO' }),
  card({ id: '20/3', title: 'Ajuste de tela', column: 'OUTUBRO', projectName: 'Outra' }),
];

describe('filterCards', () => {
  it('esconde colunas de arquivo por padrão e mostra quando pedido', () => {
    expect(filterCards(cards, EMPTY_CARD_FILTER).map((c) => c.id)).toEqual(['10/1', '10/2']);
    expect(filterCards(cards, { ...EMPTY_CARD_FILTER, showArchived: true })).toHaveLength(3);
  });

  it('busca ignorando acento e caixa, em título, id, coluna e sprint', () => {
    const find = (query: string) =>
      filterCards(cards, { ...EMPTY_CARD_FILTER, showArchived: true, query }).map((c) => c.id);
    expect(find('INTEGRACAO')).toEqual(['10/1']);
    expect(find('20/3')).toEqual(['20/3']);
    expect(find('pausado')).toEqual(['10/2']);
    expect(find('outra')).toEqual(['20/3']);
  });

  it('filtra por coluna e sprint', () => {
    expect(filterCards(cards, { ...EMPTY_CARD_FILTER, column: 'PAUSADO' })).toHaveLength(1);
    expect(
      filterCards(cards, { ...EMPTY_CARD_FILTER, showArchived: true, sprint: 'Outra' }),
    ).toHaveLength(1);
  });

  it('conta os arquivados ocultos', () => {
    expect(countHiddenArchived(cards, EMPTY_CARD_FILTER)).toBe(1);
    expect(countHiddenArchived(cards, { ...EMPTY_CARD_FILTER, showArchived: true })).toBe(0);
  });
});

describe('formatTimeInColumn', () => {
  const now = new Date('2026-11-09T12:00:00Z');
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it.each([
    [null, '—'],
    ['lixo', '—'],
    [ago(10_000), 'menos de 1 min'],
    [ago(-5_000), 'menos de 1 min'],
    [ago(12 * 60_000), '12 min'],
    [ago(5 * 3_600_000), '5 h'],
    [ago(24 * 3_600_000), '1 dia'],
    [ago(13 * 24 * 3_600_000), '13 dias'],
  ])('%s → %s', (movedAt, expected) => {
    expect(formatTimeInColumn(movedAt, now)).toBe(expected);
  });
});

describe('columnTone', () => {
  it('distingue trabalho, pausado e demais', () => {
    expect(columnTone('EM CODE REVIEW')).toBe('info');
    expect(columnTone('PAUSADO')).toBe('warning');
    expect(columnTone('BACKLOG')).toBe('neutral');
  });
});
