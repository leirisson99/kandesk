import type { TaskActionResult, TaskRepository } from '@application/ports';
import type { Task } from '@shared/types/automation';

// Tarefas FICTÍCIAS. Serão substituídas por KanbanTaskRepository quando a API existir.
const MOCK_TASKS: readonly Task[] = [
  { id: 'KB-1042', title: 'Fila de suporte N2' },
  { id: 'KB-2210', title: 'Revisão de contratos' },
  { id: 'KB-1877', title: 'Plantão financeiro' },
];

/**
 * Simula as ações sem tocar em nenhum sistema. Mantém um estado em memória por tarefa
 * (reiniciado a cada abertura do app) para reproduzir o caso "já estava no estado pedido".
 */
export class MockTaskRepository implements TaskRepository {
  private readonly paused = new Set<string>();

  async findAll(): Promise<Task[]> {
    return MOCK_TASKS.map((t) => ({ ...t }));
  }

  async findById(id: string): Promise<Task | null> {
    const task = MOCK_TASKS.find((t) => t.id === id);
    return task ? { ...task } : null;
  }

  async pause(id: string): Promise<TaskActionResult> {
    this.requireTask(id);
    if (this.paused.has(id))
      return result('ALREADY_IN_STATE', 'Estado já era "pausada"; nada a fazer');
    this.paused.add(id);
    return result('APPLIED', 'Tarefa pausada');
  }

  async resume(id: string): Promise<TaskActionResult> {
    this.requireTask(id);
    if (!this.paused.has(id)) {
      return result('ALREADY_IN_STATE', 'Estado já era "em andamento"; nada a fazer');
    }
    this.paused.delete(id);
    return result('APPLIED', 'Tarefa retomada');
  }

  private requireTask(id: string): void {
    if (!MOCK_TASKS.some((t) => t.id === id)) throw new Error(`Tarefa ${id} não encontrada`);
  }
}

function result(outcome: TaskActionResult['outcome'], message: string): TaskActionResult {
  return { outcome, message, httpStatus: null, simulated: true };
}
