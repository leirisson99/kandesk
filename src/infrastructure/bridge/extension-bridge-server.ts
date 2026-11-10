import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { CommunicationError } from '@application/errors';
import type { Clock, ExtensionGateway, TaskActionResult } from '@application/ports';
import {
  BRIDGE_PROTOCOL_VERSION,
  bridgeResultSchema,
  type BridgeCommand,
  type BridgeResult,
} from '@shared/contracts/bridge';

const MAX_BODY_BYTES = 4096;
const MAX_WAIT_SECONDS = 30;

export interface BridgeServerOptions {
  /** 0 escolhe uma porta livre (testes). */
  port: number;
  /** Lido a cada requisição, para a regeneração do código valer sem reiniciar. */
  getPairingCode: () => Promise<string>;
  clock: Clock;
  /** Quanto o servidor segura uma consulta sem comando (ms). */
  longPollMs?: number;
  /** Quanto espera a resposta da extensão depois de enfileirar o comando (ms). */
  commandTimeoutMs?: number;
  /** Sem consulta de comandos neste prazo, a extensão é considerada desconectada (ms). */
  presenceMs?: number;
  /** Diagnóstico sem dados sensíveis (ids de card e tempos). */
  log?: (message: string) => void;
}

export interface BridgeServerStatus {
  running: boolean;
  port: number | null;
  connected: boolean;
  lastSeenAt: string | null;
  error: string | null;
}

interface QueuedCommand {
  command: BridgeCommand;
  delivered: boolean;
  settle: (result: BridgeResult | Error) => void;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest();
const EXTENSION_ORIGIN = /^(chrome|moz)-extension:\/\//;

/**
 * Servidor HTTP local (somente loopback) com que a extensão do navegador conversa. A extensão
 * consulta `GET /v1/commands` (long-poll) e devolve o resultado em `POST /v1/results`.
 *
 * Segurança: só 127.0.0.1; exige `Authorization: Bearer <código de pareamento>`; confere o
 * cabeçalho Host (contra DNS rebinding) e a origem; não envia cabeçalhos CORS; corpo limitado;
 * nenhum erro devolve detalhes internos; o código nunca é registrado em log.
 */
export class ExtensionBridgeServer implements ExtensionGateway {
  private server: Server | null = null;
  private port: number | null = null;
  private error: string | null = null;
  private lastSeen: Date | null = null;
  private readonly queue: QueuedCommand[] = [];
  private readonly waiters = new Set<() => void>();
  private readonly longPollMs: number;
  private readonly commandTimeoutMs: number;
  private readonly presenceMs: number;
  private readonly log: (message: string) => void;

  constructor(private readonly options: BridgeServerOptions) {
    this.longPollMs = options.longPollMs ?? 25_000;
    this.commandTimeoutMs = options.commandTimeoutMs ?? 90_000;
    this.presenceMs = options.presenceMs ?? 150_000;
    this.log = options.log ?? (() => undefined);
  }

  /** Sobe o servidor. Porta ocupada não derruba o app: o motivo fica em `getStatus().error`. */
  start(): Promise<void> {
    return new Promise((resolve) => {
      const server = createServer((req, res) => void this.handle(req, res));
      server.once('error', (error: NodeJS.ErrnoException) => {
        this.error =
          error.code === 'EADDRINUSE'
            ? `A porta ${this.options.port} já está em uso por outro programa.`
            : 'Não foi possível iniciar o servidor local da extensão.';
        resolve();
      });
      server.listen(this.options.port, '127.0.0.1', () => {
        this.server = server;
        this.port = (server.address() as AddressInfo).port;
        this.error = null;
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    const server = this.server;
    this.server = null;
    for (const item of [...this.queue]) item.settle(new CommunicationError('O app foi encerrado.'));
    this.wakeAll();
    if (!server) return;
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
      server.closeAllConnections();
    });
  }

  getStatus(): BridgeServerStatus {
    return {
      running: this.server !== null,
      port: this.port,
      connected: this.isConnected(),
      lastSeenAt: this.lastSeen?.toISOString() ?? null,
      error: this.error,
    };
  }

  async pause(ref: string): Promise<TaskActionResult> {
    if (!this.server) {
      throw new CommunicationError(this.error ?? 'A ponte com a extensão não está ativa.');
    }
    if (!this.isConnected()) {
      throw new CommunicationError(
        'A extensão do navegador não está conectada. Abra o Chrome com a extensão instalada e pareada.',
      );
    }
    const command: BridgeCommand = { id: randomUUID(), action: 'PAUSE', ref };
    const queuedAt = this.options.clock.now().getTime();
    this.log(`pedido de pausa ${command.id.slice(0, 8)} do card ${ref} na fila`);
    const result = await new Promise<BridgeResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.log(
          `pedido ${command.id.slice(0, 8)} sem resposta (${item.delivered ? 'a extensão recebeu e não respondeu' : 'nenhuma consulta o buscou'})`,
        );
        item.settle(
          new CommunicationError(
            item.delivered
              ? 'A extensão recebeu o pedido, mas não respondeu a tempo.'
              : 'A extensão não buscou o pedido a tempo (ela não está consultando o app).',
          ),
        );
      }, this.commandTimeoutMs);
      const item: QueuedCommand = {
        command,
        delivered: false,
        settle: (outcome) => {
          clearTimeout(timer);
          const index = this.queue.indexOf(item);
          if (index >= 0) this.queue.splice(index, 1);
          if (outcome instanceof Error) reject(outcome);
          else resolve(outcome);
        },
      };
      this.queue.push(item);
      this.wakeAll();
    });

    this.log(
      `pedido ${command.id.slice(0, 8)} respondido: ${result.outcome} em ${this.options.clock.now().getTime() - queuedAt} ms`,
    );
    if (result.outcome === 'FAILED') throw new CommunicationError(result.message);
    return { outcome: result.outcome, message: result.message, httpStatus: null };
  }

  private isConnected(): boolean {
    return (
      this.lastSeen !== null &&
      this.options.clock.now().getTime() - this.lastSeen.getTime() <= this.presenceMs
    );
  }

  private wakeAll(): void {
    for (const wake of [...this.waiters]) wake();
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      if (!this.hostAllowed(req)) return this.send(res, 403, { error: 'forbidden' });
      const origin = req.headers.origin;
      if (origin && !EXTENSION_ORIGIN.test(origin))
        return this.send(res, 403, { error: 'forbidden' });
      if (!(await this.authorized(req))) return this.send(res, 401, { error: 'unauthorized' });

      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      if (req.method === 'GET' && url.pathname === '/v1/hello') {
        // Teste das opções: prova que o app responde, mas NÃO conta como extensão conectada.
        return this.send(res, 200, { app: 'kandesk', protocol: BRIDGE_PROTOCOL_VERSION });
      }
      if (req.method === 'GET' && url.pathname === '/v1/commands') {
        this.lastSeen = this.options.clock.now();
        return await this.longPoll(req, res, url);
      }
      if (req.method === 'POST' && url.pathname === '/v1/results') {
        return await this.receiveResult(req, res);
      }
      return this.send(res, 404, { error: 'not_found' });
    } catch {
      // Sem detalhes: o corpo e o erro podem conter dados que não devem sair do app.
      if (!res.headersSent) this.send(res, 500, { error: 'internal' });
      else res.end();
    }
  }

  private hostAllowed(req: IncomingMessage): boolean {
    const host = req.headers.host;
    return host === `127.0.0.1:${this.port}` || host === `localhost:${this.port}`;
  }

  private async authorized(req: IncomingMessage): Promise<boolean> {
    const header = req.headers.authorization ?? '';
    const match = /^Bearer (.+)$/.exec(header);
    if (!match?.[1]) return false;
    let expected: string;
    try {
      expected = await this.options.getPairingCode();
    } catch {
      return false; // sem código (armazenamento seguro indisponível), ninguém entra
    }
    return timingSafeEqual(sha256(match[1]), sha256(expected));
  }

  private longPoll(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
    const requested = Number(url.searchParams.get('wait') ?? 0);
    const waitMs = Number.isFinite(requested)
      ? Math.min(Math.max(requested, 0), MAX_WAIT_SECONDS) * 1000
      : 0;
    const budget = Math.min(waitMs, this.longPollMs);

    return new Promise((resolve) => {
      const timer = setTimeout(onTimeout, budget);

      function finish() {
        clearTimeout(timer);
        waiters.delete(check);
        req.off('close', finish);
        resolve();
      }
      /** Entrega o próximo comando ainda não entregue, se houver. */
      function check(): boolean {
        const next = queue.find((item) => !item.delivered);
        if (!next) return false;
        next.delivered = true;
        log(`pedido ${next.command.id.slice(0, 8)} entregue à extensão`);
        send(200, next.command);
        finish();
        return true;
      }
      function onTimeout() {
        if (!res.writableEnded) {
          res.writeHead(204, { 'Cache-Control': 'no-store' });
          res.end();
        }
        finish();
      }

      const { queue, waiters, log } = this;
      const send = (status: number, body: unknown) => this.send(res, status, body);
      waiters.add(check);
      req.once('close', finish);
      check();
    });
  }

  private async receiveResult(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    if (body === null) {
      // Responde primeiro e só então derruba a conexão, para o cliente ver o 413.
      res.once('finish', () => req.destroy());
      return this.send(res, 413, { error: 'too_large' }, { Connection: 'close' });
    }
    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch {
      return this.send(res, 400, { error: 'invalid_json' });
    }
    const parsed = bridgeResultSchema.safeParse(json);
    if (!parsed.success) return this.send(res, 400, { error: 'invalid_result' });

    const item = this.queue.find((q) => q.command.id === parsed.data.commandId && q.delivered);
    if (!item) return this.send(res, 404, { error: 'unknown_command' });
    item.settle(parsed.data);
    res.writeHead(204, { 'Cache-Control': 'no-store' });
    res.end();
  }

  /** Lê o corpo com limite; devolve null se passar do máximo. */
  private readBody(req: IncomingMessage): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let size = 0;
      let tooLarge = false;
      req.on('data', (chunk: Buffer) => {
        if (tooLarge) return; // descarta o excedente sem acumular na memória
        size += chunk.length;
        if (size > MAX_BODY_BYTES) {
          tooLarge = true;
          chunks.length = 0;
          resolve(null);
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => resolve(tooLarge ? null : Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
  }

  private send(
    res: ServerResponse,
    status: number,
    body: unknown,
    extraHeaders: Record<string, string> = {},
  ): void {
    if (res.headersSent) return;
    res.writeHead(status, {
      ...extraHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(JSON.stringify(body));
  }
}
