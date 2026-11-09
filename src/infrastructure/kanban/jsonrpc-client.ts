import { z } from 'zod';
import { AuthError, CommunicationError } from '@application/errors';
import type { KanbanCredentials } from '@application/ports';

/** Chamadas por envio em lote (o mesmo limite que a extensão de referência usa). */
const BATCH_SIZE = 40;
const DEFAULT_TIMEOUT_MS = 15_000;

export interface RpcCall {
  method: string;
  params?: Record<string, unknown>;
}

export type RpcResult = { ok: true; result: unknown } | { ok: false; message: string };

const responseItemSchema = z.object({
  id: z.union([z.number(), z.string()]),
  result: z.unknown().optional(),
  error: z.object({ message: z.string().optional() }).optional(),
});
const responseSchema = z.union([z.array(responseItemSchema), responseItemSchema]);

interface Options {
  baseUrl: string;
  /** Injetável para testes. */
  fetch?: typeof fetch;
  timeoutMs?: number;
}

/**
 * Cliente da API JSON-RPC do Kanboard (`/jsonrpc.php`) com Basic auth (usuário + token).
 * Regras: o token só vai no cabeçalho; nenhuma mensagem de erro o inclui; nunca registra
 * cabeçalhos nem corpos de resposta.
 */
export class KanbanJsonRpcClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor({ baseUrl, fetch: fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS }: Options) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  /** Várias chamadas; o resultado mantém a ordem. Erros de uma chamada não derrubam as outras. */
  async callMany(credentials: KanbanCredentials, calls: RpcCall[]): Promise<RpcResult[]> {
    const results: RpcResult[] = [];
    for (let start = 0; start < calls.length; start += BATCH_SIZE) {
      results.push(...(await this.sendBatch(credentials, calls.slice(start, start + BATCH_SIZE))));
    }
    return results;
  }

  /** Uma chamada; lança CommunicationError se o Kanban devolver erro para ela. */
  async call(
    credentials: KanbanCredentials,
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<unknown> {
    const [outcome] = await this.callMany(credentials, [{ method, params }]);
    if (!outcome) throw new CommunicationError('Resposta vazia do Kanboard.');
    if (!outcome.ok)
      throw new CommunicationError(`O Kanboard recusou ${method}: ${outcome.message}`);
    return outcome.result;
  }

  private async sendBatch(credentials: KanbanCredentials, calls: RpcCall[]): Promise<RpcResult[]> {
    const body = calls.map((call, index) => ({
      jsonrpc: '2.0',
      id: index + 1,
      method: call.method,
      params: call.params ?? {},
    }));
    const authorization = Buffer.from(`${credentials.username}:${credentials.token}`).toString(
      'base64',
    );

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/jsonrpc.php`, {
        method: 'POST',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${authorization}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      // Só o nome do erro: a mensagem/causa de fetch poderia conter detalhes da requisição.
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new CommunicationError('Tempo esgotado ao falar com o Kanboard.');
      }
      throw new CommunicationError(
        'Não foi possível alcançar o Kanboard. Verifique a conexão com a rede.',
      );
    }

    if (response.status === 401) {
      throw new AuthError('O Kanboard recusou o usuário ou o token da API.');
    }
    if (response.status === 403) {
      throw new AuthError('O Kanboard negou a permissão para esta operação.');
    }
    if (!response.ok) {
      throw new CommunicationError(`O Kanboard respondeu com erro HTTP ${response.status}.`);
    }

    let parsed: z.infer<typeof responseSchema>;
    try {
      parsed = responseSchema.parse(await response.json());
    } catch {
      throw new CommunicationError('Resposta inesperada do Kanboard.');
    }

    const byId = new Map(
      (Array.isArray(parsed) ? parsed : [parsed]).map((item) => [item.id, item]),
    );
    return calls.map((_call, index): RpcResult => {
      const item = byId.get(index + 1);
      if (!item) return { ok: false, message: 'sem resposta' };
      if (item.error) return { ok: false, message: item.error.message ?? 'erro desconhecido' };
      return { ok: true, result: item.result };
    });
  }
}
