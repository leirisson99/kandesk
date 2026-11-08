import { beforeEach, describe, expect, it } from 'vitest';
import type { Automation } from '@shared/types/automation';
import { DomainError, NotFoundError, ValidationError } from '../errors';
import type { AutomationRepository, TaskRepository } from '../ports';
import { createAutomationUseCases } from './automations';

class InMemoryAutomations implements AutomationRepository {
  items = new Map<string, Automation>();
  async findAll() {
    return [...this.items.values()];
  }
  async findById(id: string) {
    return this.items.get(id) ?? null;
  }
  async save(a: Automation) {
    this.items.set(a.id, a);
  }
  async markExecuted() {}
  async delete(id: string) {
    this.items.delete(id);
  }
}

const tasks: TaskRepository = {
  findAll: async () => [{ id: 'KB-1', title: 'Tarefa' }],
  findById: async (id) => (id === 'KB-1' ? { id, title: 'Tarefa' } : null),
  pause: async () => ({ outcome: 'APPLIED', message: '', httpStatus: null, simulated: true }),
  resume: async () => ({ outcome: 'APPLIED', message: '', httpStatus: null, simulated: true }),
};

const input = {
  name: 'Almoço',
  taskId: 'KB-1',
  pauseAt: '12:00',
  resumeAt: '13:00',
  weekdays: [1, 2, 3],
  timezone: 'America/Sao_Paulo',
  enabled: true,
};

describe('automation use cases', () => {
  let repo: InMemoryAutomations;
  let time: Date;
  let useCases: ReturnType<typeof createAutomationUseCases>;
  let changes: number;

  beforeEach(() => {
    repo = new InMemoryAutomations();
    time = new Date('2026-11-07T12:00:00.000Z');
    changes = 0;
    let n = 0;
    useCases = createAutomationUseCases({
      automations: repo,
      tasks,
      clock: { now: () => time },
      ids: { next: () => `id-${++n}` },
      onChange: () => void changes++,
    });
  });

  it('cria com id, datas e sem última execução', async () => {
    const created = await useCases.create(input);
    expect(created).toMatchObject({ id: 'id-1', lastExecutedAt: null });
    expect(created.createdAt).toBe('2026-11-07T12:00:00.000Z');
    expect(await useCases.list()).toHaveLength(1);
  });

  it('rejeita entrada inválida e tarefa inexistente', async () => {
    await expect(useCases.create({ ...input, weekdays: [] })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(useCases.create({ ...input, taskId: 'KB-9' })).rejects.toBeInstanceOf(DomainError);
    expect(repo.items.size).toBe(0);
  });

  it('atualiza preservando createdAt e renovando updatedAt', async () => {
    const created = await useCases.create(input);
    time = new Date('2026-11-08T00:00:00.000Z');
    const updated = await useCases.update(created.id, { ...input, name: 'Novo nome' });
    expect(updated.name).toBe('Novo nome');
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt).toBe('2026-11-08T00:00:00.000Z');
  });

  it('ativa e desativa', async () => {
    const created = await useCases.create(input);
    expect((await useCases.setEnabled(created.id, false)).enabled).toBe(false);
    expect((await useCases.setEnabled(created.id, true)).enabled).toBe(true);
  });

  it('exclui e falha ao operar sobre automação inexistente', async () => {
    const created = await useCases.create(input);
    await useCases.remove(created.id);
    expect(repo.items.size).toBe(0);
    await expect(useCases.remove(created.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(useCases.update('x', input)).rejects.toBeInstanceOf(NotFoundError);
    await expect(useCases.setEnabled('x', true)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('avisa quem depende das regras (agendador) a cada alteração', async () => {
    const created = await useCases.create(input);
    await useCases.update(created.id, input);
    await useCases.setEnabled(created.id, false);
    await useCases.remove(created.id);
    expect(changes).toBe(4);
  });
});
