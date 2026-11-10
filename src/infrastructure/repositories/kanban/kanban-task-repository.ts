import { z } from 'zod';
import { AuthError, CommunicationError } from '@application/errors';
import type {
  Clock,
  CredentialStore,
  ExtensionGateway,
  KanbanAuthClient,
  KanbanCredentials,
  TaskActionResult,
  TaskRepository,
} from '@application/ports';
import { classifyColumn } from '@shared/domain/kanban-columns';
import { unixSecondsToIso } from '@shared/domain/unix-time';
import type { Task } from '@shared/types/automation';
import type { KanbanJsonRpcClient } from '../../kanban/jsonrpc-client';

const CACHE_TTL_MS = 60_000;
const MANUAL_RESUME_MESSAGE =
  'Retome o cronômetro manualmente no Kanboard. O app ainda não retoma sozinho.';

const idSchema = z.union([z.number(), z.string()]).transform(String);
const listOf = <T extends z.ZodType>(item: T) =>
  z
    .array(item)
    .nullish()
    .transform((value) => value ?? []);

// Formatos observados no Kanboard (docs/KANBAN_INVESTIGATION.md §6 e §7.1).
const projectsSchema = z.array(
  z.object({ id: idSchema, is_active: z.union([z.number(), z.string()]).optional() }),
);
const boardSchema = z.array(
  z.object({
    columns: listOf(
      z.object({
        title: z.string(),
        tasks: listOf(
          z.object({
            id: idSchema,
            title: z.string().nullish(),
            /** Responsável pelo card ("0" quando não há). */
            owner_id: idSchema.nullish(),
            /** Segundos Unix (texto) em que o card entrou na coluna atual. */
            date_moved: z.unknown().optional(),
            assignee_name: z.string().nullish(),
            project_name: z.string().nullish(),
          }),
        ),
      }),
    ),
  }),
);

interface BoardCard {
  projectId: string;
  taskId: string;
  title: string;
  column: string;
  ownerId: string | null;
  projectName: string;
  assignee: string | null;
  movedAt: string | null;
}

/**
 * Lê as tarefas do Kanboard. A pausa é feita pela extensão do navegador (a API por token não
 * pausa; ver docs/KANBAN_INVESTIGATION.md §11 #21). A retomada é manual: o app só avisa.
 */
export class KanbanTaskRepository implements TaskRepository {
  private cache: { key: string; at: number; tasks: Task[] } | null = null;

  constructor(
    private readonly rpc: KanbanJsonRpcClient,
    private readonly credentials: CredentialStore,
    private readonly auth: KanbanAuthClient,
    private readonly clock: Clock,
    private readonly extension: ExtensionGateway,
  ) {}

  /**
   * Cards cujo responsável (`owner_id`) sou eu, nas sprints ativas. As colunas de trabalho
   * (EM …, PAUSADO) vêm primeiro; a ordem do quadro é mantida dentro de cada grupo.
   */
  async findAll({ refresh = false }: { refresh?: boolean } = {}): Promise<Task[]> {
    const credentials = await this.requireCredentials();
    const now = this.clock.now().getTime();
    if (
      !refresh &&
      this.cache?.key === credentials.username &&
      now - this.cache.at < CACHE_TTL_MS
    ) {
      return this.cache.tasks.map((t) => ({ ...t }));
    }

    const me = await this.auth.verify(credentials);
    const projectIds = await this.activeProjectIds(credentials);
    const boards = await this.rpc.callMany(
      credentials,
      projectIds.map((id) => ({ method: 'getBoard', params: { project_id: Number(id) } })),
    );

    const mine: BoardCard[] = [];
    let failedBoards = 0;
    boards.forEach((outcome, index) => {
      const projectId = projectIds[index] as string;
      const parsed = outcome.ok ? boardSchema.safeParse(outcome.result) : null;
      if (!parsed?.success) {
        failedBoards += 1;
        console.warn(`Quadro da sprint ${projectId} indisponível; ignorado nesta leitura.`);
        return;
      }
      mine.push(...cardsOf(projectId, parsed.data).filter((card) => card.ownerId === me.id));
    });
    if (projectIds.length > 0 && failedBoards === projectIds.length) {
      throw new CommunicationError('Não foi possível ler nenhum quadro do Kanboard.');
    }

    const working = mine.filter((card) => classifyColumn(card.column));
    const others = mine.filter((card) => !classifyColumn(card.column));
    const tasks = [...working, ...others].map(toTask);
    this.cache = { key: credentials.username, at: now, tasks };
    return tasks.map((t) => ({ ...t }));
  }

  /** Procura o card no quadro da sprint. Qualquer coluna e responsável servem; só precisa existir. */
  async findById(id: string): Promise<Task | null> {
    const match = /^(\d+)\/(\d+)$/.exec(id);
    if (!match) return null;
    const [, projectId, taskId] = match as unknown as [string, string, string];
    const credentials = await this.requireCredentials();

    const raw = await this.rpc.call(credentials, 'getBoard', { project_id: Number(projectId) });
    const parsed = boardSchema.safeParse(raw);
    if (!parsed.success) {
      throw new CommunicationError('O Kanboard devolveu o quadro em formato inesperado.');
    }
    const card = cardsOf(projectId, parsed.data).find((c) => c.taskId === taskId);
    return card ? toTask(card) : null;
  }

  /** Pede à extensão que pause. Lança erro se ela não estiver conectada ou não responder. */
  pause(id: string): Promise<TaskActionResult> {
    return this.extension.pause(id);
  }

  /** O app não retoma: devolve um aviso para o usuário fazer manualmente. */
  async resume(): Promise<TaskActionResult> {
    return { outcome: 'MANUAL_ACTION_REQUIRED', message: MANUAL_RESUME_MESSAGE, httpStatus: null };
  }

  private async requireCredentials(): Promise<KanbanCredentials> {
    const stored = await this.credentials.load();
    if (!stored) throw new AuthError('Conecte sua conta do Kanban em Configurações.');
    return stored;
  }

  private async activeProjectIds(credentials: KanbanCredentials): Promise<string[]> {
    const parsed = projectsSchema.safeParse(await this.rpc.call(credentials, 'getMyProjects'));
    if (!parsed.success) {
      throw new CommunicationError('O Kanboard devolveu a lista de sprints em formato inesperado.');
    }
    return parsed.data.filter((p) => String(p.is_active) === '1').map((p) => p.id);
  }
}

function cardsOf(projectId: string, board: z.infer<typeof boardSchema>): BoardCard[] {
  return board.flatMap((swimlane) =>
    swimlane.columns.flatMap((column) =>
      column.tasks.map((task) => ({
        projectId,
        taskId: task.id,
        title: task.title?.trim() || `Tarefa ${task.id}`,
        column: column.title,
        ownerId: task.owner_id ?? null,
        projectName: task.project_name?.trim() || `Sprint ${projectId}`,
        assignee: task.assignee_name?.trim() || null,
        movedAt: unixSecondsToIso(task.date_moved),
      })),
    ),
  );
}

function toTask(card: BoardCard): Task {
  return {
    id: `${card.projectId}/${card.taskId}`,
    title: card.title,
    column: card.column,
    projectName: card.projectName,
    assignee: card.assignee,
    movedAt: card.movedAt,
  };
}
