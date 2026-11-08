import { describe, expect, it } from 'vitest';
import type { Automation } from '@shared/types/automation';
import { normalizeText, searchAutomations } from './search';

const make = (id: string, name: string, taskId = 'KB-1'): Automation => ({
  id,
  name,
  taskId,
  pauseAt: '12:00',
  resumeAt: '13:00',
  weekdays: [1],
  timezone: 'UTC',
  enabled: true,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  lastExecutedAt: null,
});

const list = [make('1', 'Pausa de almoço', 'KB-1042'), make('2', 'Fim do expediente', 'KB-2210')];

describe('searchAutomations', () => {
  it('ignora acentos e maiúsculas', () => {
    expect(normalizeText('  AlmoÇo ')).toBe('almoco');
    expect(searchAutomations(list, 'ALMOCO').map((a) => a.id)).toEqual(['1']);
  });

  it('encontra pelo id da tarefa', () => {
    expect(searchAutomations(list, 'kb-2210').map((a) => a.id)).toEqual(['2']);
  });

  it('texto vazio não lista nada e respeita o limite', () => {
    expect(searchAutomations(list, '   ')).toEqual([]);
    expect(searchAutomations(list, 'k', 1)).toHaveLength(1);
  });
});
