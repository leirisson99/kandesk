import { describe, expect, it } from 'vitest';
import { AuthError, CommunicationError } from '@application/errors';
import type { CredentialStore, ExtensionGateway, KanbanAuthClient } from '@application/ports';
import { KanbanJsonRpcClient } from '../../kanban/jsonrpc-client';
import { KanbanTaskRepository } from './kanban-task-repository';

const stored = { username: 'maria', token: 'SEGREDO', displayName: 'Maria' };

type Handler = (params: Record<string, unknown>) => unknown;

/** Simula o Kanboard: cada método devolve o resultado do handler (ou { error } para falhar). */
function setup(methods: Record<string, Handler>, { connected = true } = {}) {
  const calls: string[] = [];
  const paused: string[] = [];
  const gateway: ExtensionGateway = {
    pause: async (ref) => {
      paused.push(ref);
      return { outcome: 'APPLIED', message: 'Pausado', httpStatus: null };
    },
  };
  const fakeFetch = (async (_url: string, init: RequestInit) => {
    const sent = JSON.parse(String(init.body)) as {
      id: number;
      method: string;
      params: Record<string, unknown>;
    }[];
    const body = sent.map((call) => {
      calls.push(call.method);
      const out = methods[call.method]?.(call.params);
      return out && typeof out === 'object' && 'error' in out
        ? {
            jsonrpc: '2.0',
            id: call.id,
            error: { message: String((out as { error: string }).error) },
          }
        : { jsonrpc: '2.0', id: call.id, result: out };
    });
    return new Response(JSON.stringify(body), { status: 200 });
  }) as unknown as typeof fetch;

  const credentials: CredentialStore = {
    isAvailable: async () => true,
    load: async () => (connected ? stored : null),
    save: async () => {},
    clear: async () => {},
  };
  const auth: KanbanAuthClient = {
    verify: async () => ({ id: '451', username: 'maria', name: 'Maria' }),
  };
  let now = new Date('2026-11-09T10:00:00Z');
  const repo = new KanbanTaskRepository(
    new KanbanJsonRpcClient({ baseUrl: 'https://kb.test', fetch: fakeFetch }),
    credentials,
    auth,
    { now: () => now },
    gateway,
  );
  return {
    repo,
    calls,
    paused,
    advance: (ms: number) => {
      now = new Date(now.getTime() + ms);
    },
  };
}

const board = (
  columns: {
    title: string;
    tasks: {
      id: number;
      title: string;
      owner_id: string | number;
      date_moved?: string;
      assignee_name?: string;
      project_name?: string;
    }[];
  }[],
) => [{ columns }];

const kanban = {
  getMyProjects: () => [
    { id: 10, is_active: '1' },
    { id: 11, is_active: '0' },
  ],
  getBoard: ({ project_id }: Record<string, unknown>) =>
    project_id === 10
      ? board([
          {
            title: 'BACKLOG',
            tasks: [{ id: 1, title: 'Meu, mas fora de coluna de trabalho', owner_id: '451' }],
          },
          {
            title: 'EM DESENVOLVIMENTO',
            tasks: [
              {
                id: 2,
                title: 'Meu card',
                owner_id: '451',
                date_moved: '1793039219',
                assignee_name: ' Maria ',
                project_name: 'Humanus',
              },
            ],
          },
          { title: 'PAUSADO', tasks: [{ id: 3, title: 'Card de outra pessoa', owner_id: '999' }] },
          { title: 'EM CODE REVIEW', tasks: [{ id: 4, title: 'Sem responsável', owner_id: '0' }] },
          { title: 'PAUSADO', tasks: [{ id: 5, title: 'Meu pausado', owner_id: 451 }] },
        ])
      : { error: 'Project not found' },
};

describe('KanbanTaskRepository.findAll', () => {
  it('lista os cards em que sou o responsável, com colunas de trabalho primeiro', async () => {
    const { repo, calls } = setup(kanban);
    const tasks = await repo.findAll();
    expect(tasks.map((t) => [t.id, t.column])).toEqual([
      ['10/2', 'EM DESENVOLVIMENTO'],
      ['10/5', 'PAUSADO'],
      ['10/1', 'BACKLOG'],
    ]);
    // sprint inativa (11) não é consultada e não há consulta por requisito
    expect(calls.filter((m) => m === 'getBoard')).toHaveLength(1);
    expect(calls).not.toContain('getAllSubtasks');
  });

  it('traz sprint, responsável e quando entrou na coluna, sem inventar o que falta', async () => {
    const { repo } = setup(kanban);
    const [complete, minimal] = await repo.findAll();
    expect(complete).toMatchObject({
      id: '10/2',
      projectName: 'Humanus',
      assignee: 'Maria',
      movedAt: '2026-10-26T18:26:59.000Z',
    });
    expect(minimal).toMatchObject({ projectName: 'Sprint 10', assignee: null, movedAt: null });
  });

  it('refresh ignora o cache', async () => {
    const { repo, calls } = setup(kanban);
    await repo.findAll();
    await repo.findAll({ refresh: true });
    expect(calls.filter((m) => m === 'getMyProjects')).toHaveLength(2);
  });

  it('exige conta conectada', async () => {
    const { repo } = setup(kanban, { connected: false });
    await expect(repo.findAll()).rejects.toBeInstanceOf(AuthError);
  });

  it('usa cache por 60 s e refaz a leitura depois', async () => {
    const { repo, calls, advance } = setup(kanban);
    await repo.findAll();
    await repo.findAll();
    expect(calls.filter((m) => m === 'getMyProjects')).toHaveLength(1);
    advance(61_000);
    await repo.findAll();
    expect(calls.filter((m) => m === 'getMyProjects')).toHaveLength(2);
  });

  it('falha de forma explícita quando nenhum quadro pode ser lido', async () => {
    const { repo } = setup({ ...kanban, getBoard: () => ({ error: 'Forbidden' }) });
    await expect(repo.findAll()).rejects.toBeInstanceOf(CommunicationError);
  });

  it('rejeita lista de sprints em formato inesperado', async () => {
    const { repo } = setup({ ...kanban, getMyProjects: () => 'x' });
    await expect(repo.findAll()).rejects.toThrow(/formato inesperado/);
  });
});

describe('KanbanTaskRepository.findById', () => {
  it('encontra o card em qualquer coluna e de qualquer responsável', async () => {
    const { repo } = setup(kanban);
    expect(await repo.findById('10/3')).toEqual({
      id: '10/3',
      title: 'Card de outra pessoa',
      column: 'PAUSADO',
      projectName: 'Sprint 10',
      assignee: null,
      movedAt: null,
    });
  });

  it('devolve null quando o card não existe ou o id é inválido', async () => {
    const { repo } = setup(kanban);
    expect(await repo.findById('10/99')).toBeNull();
    expect(await repo.findById('KB-1042')).toBeNull();
  });
});

describe('pausa e retomada', () => {
  it('a pausa vai para a extensão', async () => {
    const { repo, paused } = setup(kanban);
    expect(await repo.pause('10/2')).toEqual({
      outcome: 'APPLIED',
      message: 'Pausado',
      httpStatus: null,
    });
    expect(paused).toEqual(['10/2']);
  });

  it('a retomada é manual: o app só avisa, sem alterar nada', async () => {
    const { repo, paused, calls } = setup(kanban);
    const result = await repo.resume();
    expect(result.outcome).toBe('MANUAL_ACTION_REQUIRED');
    expect(result.message).toMatch(/manualmente/);
    expect(paused).toEqual([]);
    expect(calls).toEqual([]);
  });
});
