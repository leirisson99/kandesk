import { describe, expect, it } from 'vitest';
import { classifyColumn, isArchiveColumn } from './kanban-columns';

describe('classifyColumn', () => {
  it.each([
    ['EM DESENVOLVIMENTO', 'working'],
    ['Em Code Review', 'working'],
    ['EM HOMOLOGAÇÃO', 'working'],
    ['PAUSADO', 'paused'],
    ['Desenvolvimento parado', 'paused'],
    ['TESTE PARADO', 'paused'],
    ['  pausado ', 'paused'],
  ] as const)('%s → %s', (name, kind) => {
    expect(classifyColumn(name)).toBe(kind);
  });

  it.each(['BACKLOG', 'CONCLUÍDO', 'HOMOLOGAÇÃO', 'REMEMBER EM'])(
    '%s não é acompanhada',
    (name) => {
      expect(classifyColumn(name)).toBeNull();
    },
  );
});

describe('isArchiveColumn', () => {
  it.each(['OUTUBRO', 'Março', ' maio '])('%s é arquivo', (name) => {
    expect(isArchiveColumn(name)).toBe(true);
  });

  it.each(['EM DESENVOLVIMENTO', 'LIBERADO PRODUÇÃO', 'OUTUBRO 2026', 'BACKLOG'])(
    '%s não é arquivo',
    (name) => {
      expect(isArchiveColumn(name)).toBe(false);
    },
  );
});
