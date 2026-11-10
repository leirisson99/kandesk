import { request } from 'node:http';
import { createServer } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CommunicationError } from '@application/errors';
import { ExtensionBridgeServer, type BridgeServerOptions } from './extension-bridge-server';

const CODE = 'codigo-de-pareamento-de-teste';

let now = new Date('2026-11-10T12:00:00Z');
let server: ExtensionBridgeServer;
let base = '';

async function boot(overrides: Partial<BridgeServerOptions> = {}) {
  server = new ExtensionBridgeServer({
    port: 0,
    getPairingCode: async () => CODE,
    clock: { now: () => now },
    longPollMs: 150,
    commandTimeoutMs: 400,
    presenceMs: 60_000,
    ...overrides,
  });
  await server.start();
  base = `http://127.0.0.1:${server.getStatus().port}`;
}

const auth = { Authorization: `Bearer ${CODE}` };
/** A extensão "aparece" quando consulta comandos (o /v1/hello das opções não conta). */
const appear = () => get('/v1/commands?wait=0');
const get = (path: string, headers: Record<string, string> = auth) =>
  fetch(base + path, { headers });
const post = (path: string, body: unknown, headers: Record<string, string> = auth) =>
  fetch(base + path, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

/** Requisição com cabeçalhos livres (o fetch não deixa trocar o Host). */
function raw(path: string, headers: Record<string, string>): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = request(base + path, { headers }, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on('error', reject);
    req.end();
  });
}

beforeEach(() => {
  now = new Date('2026-11-10T12:00:00Z');
});
afterEach(async () => {
  await server.stop();
});

describe('autenticação e proteção', () => {
  beforeEach(() => boot());

  it('recusa sem código ou com código errado', async () => {
    expect((await get('/v1/hello', {})).status).toBe(401);
    expect((await get('/v1/hello', { Authorization: 'Bearer outro' })).status).toBe(401);
    expect((await get('/v1/hello', { Authorization: CODE })).status).toBe(401);
  });

  it('aceita o código certo e responde sem cabeçalhos CORS', async () => {
    const res = await get('/v1/hello');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ app: 'kandesk', protocol: 1 });
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('recusa Host diferente de 127.0.0.1/localhost (DNS rebinding)', async () => {
    expect(await raw('/v1/hello', { ...auth, Host: 'evil.test' })).toBe(403);
    expect(await raw('/v1/hello', { ...auth, Host: `evil.test:${server.getStatus().port}` })).toBe(
      403,
    );
  });

  it('recusa origem de página web, mesmo com o código certo', async () => {
    expect(await raw('/v1/hello', { ...auth, Origin: 'https://evil.test' })).toBe(403);
    expect(await raw('/v1/hello', { ...auth, Origin: 'chrome-extension://abc' })).toBe(200);
  });

  it('não vaza detalhes: rota desconhecida é 404 e método errado também', async () => {
    expect((await get('/v1/nada')).status).toBe(404);
    expect((await post('/v1/hello', {})).status).toBe(404);
  });

  it('limita o tamanho do corpo e valida o formato', async () => {
    expect((await post('/v1/results', 'x'.repeat(10_000))).status).toBe(413);
    expect((await post('/v1/results', 'não é json')).status).toBe(400);
    expect((await post('/v1/results', { commandId: 'a' })).status).toBe(400);
    expect(
      (await post('/v1/results', { commandId: 'a', outcome: 'APPLIED', message: 'ok' })).status,
    ).toBe(404);
  });
});

describe('long-poll', () => {
  beforeEach(() => boot());

  it('responde 204 depois do prazo quando não há comando', async () => {
    const started = Date.now();
    const res = await get('/v1/commands?wait=25');
    expect(res.status).toBe(204);
    expect(Date.now() - started).toBeGreaterThanOrEqual(120);
  });

  it('wait=0 responde na hora', async () => {
    const started = Date.now();
    expect((await get('/v1/commands?wait=0')).status).toBe(204);
    expect(Date.now() - started).toBeLessThan(120);
  });
});

describe('pausa pela extensão', () => {
  beforeEach(() => boot());

  /** Simula a extensão: consulta, recebe o comando e responde. */
  async function extension(outcome: 'APPLIED' | 'ALREADY_IN_STATE' | 'FAILED', message = 'ok') {
    const res = await get('/v1/commands?wait=25');
    const command = (await res.json()) as { id: string; action: string; ref: string };
    await post('/v1/results', { commandId: command.id, outcome, message });
    return command;
  }

  it('falha de imediato se a extensão nunca se conectou', async () => {
    await expect(server.pause('10/1')).rejects.toBeInstanceOf(CommunicationError);
    await expect(server.pause('10/1')).rejects.toThrow(/não está conectada/);
  });

  it('entrega o comando e devolve o resultado', async () => {
    await appear(); // a extensão aparece
    const pausing = server.pause('10526/254251');
    const [result, command] = await Promise.all([pausing, extension('APPLIED', 'Pausado')]);
    expect(command).toMatchObject({ action: 'PAUSE', ref: '10526/254251' });
    expect(result).toEqual({ outcome: 'APPLIED', message: 'Pausado', httpStatus: null });
  });

  it('repassa "nada estava rodando"', async () => {
    await appear();
    const [result] = await Promise.all([
      server.pause('1/2'),
      extension('ALREADY_IN_STATE', 'Nada rodando'),
    ]);
    expect(result.outcome).toBe('ALREADY_IN_STATE');
  });

  it('transforma falha da extensão em erro com a mensagem dela', async () => {
    await appear();
    const pausing = server.pause('1/2');
    const expectation = expect(pausing).rejects.toThrow('Faça login no Kanboard');
    await extension('FAILED', 'Faça login no Kanboard');
    await expectation;
  });

  it('dá erro se a extensão recebe e não responde a tempo', async () => {
    await appear();
    const pausing = server.pause('1/2');
    const expectation = expect(pausing).rejects.toThrow(/não respondeu a tempo/);
    await get('/v1/commands?wait=25'); // pega o comando e some
    await expectation;
  });

  it('entrega vários comandos em ordem, um por consulta', async () => {
    await appear();
    const first = server.pause('1/1');
    const second = server.pause('1/2');
    const [a, b] = await Promise.all([
      first,
      second,
      extension('APPLIED', 'um'),
      extension('APPLIED', 'dois'),
    ]);
    expect([a.message, b.message]).toEqual(['um', 'dois']);
  });

  it('só aceita resultado de comando já entregue', async () => {
    await appear();
    const pausing = server.pause('1/2').catch((e: unknown) => e);
    const res = await post('/v1/results', {
      commandId: 'inexistente',
      outcome: 'APPLIED',
      message: 'x',
    });
    expect(res.status).toBe(404);
    await pausing;
  });

  it('o teste das opções (/v1/hello) não conta como extensão conectada', async () => {
    expect((await get('/v1/hello')).status).toBe(200);
    expect(server.getStatus().connected).toBe(false);
    await expect(server.pause('1/2')).rejects.toThrow(/não está conectada/);
  });

  it('distingue "ninguém buscou" de "recebeu e não respondeu"', async () => {
    await appear();
    const notFetched = expect(server.pause('1/2')).rejects.toThrow(/não buscou o pedido/);
    await notFetched;

    await appear();
    const noReply = expect(server.pause('1/3')).rejects.toThrow(
      /recebeu o pedido, mas não respondeu/,
    );
    await get('/v1/commands?wait=25'); // pega o pedido e some
    await noReply;
  });

  it('considera a extensão desconectada depois do prazo de presença', async () => {
    await appear();
    expect(server.getStatus().connected).toBe(true);
    now = new Date(now.getTime() + 61_000);
    expect(server.getStatus().connected).toBe(false);
    await expect(server.pause('1/2')).rejects.toThrow(/não está conectada/);
  });

  it('stop() rejeita o que estava pendente', async () => {
    await appear();
    const pausing = server.pause('1/2');
    const expectation = expect(pausing).rejects.toThrow(/encerrado/);
    await server.stop();
    await expectation;
  });
});

describe('conexão de consulta derrubada pelo cliente', () => {
  beforeEach(() => boot({ longPollMs: 2000, commandTimeoutMs: 1500 }));

  it('não entrega o comando a uma consulta que o cliente já abandonou', async () => {
    await appear();
    // A extensão abre a consulta e some (service worker adormeceu / extensão recarregada).
    const abandoned = new AbortController();
    const zombie = fetch(`${base}/v1/commands?wait=25`, {
      headers: auth,
      signal: abandoned.signal,
    });
    zombie.catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 80));
    abandoned.abort();
    await new Promise((resolve) => setTimeout(resolve, 80));

    // Chega um pedido de pausa; uma nova consulta (extensão viva) precisa receber o comando.
    const pausing = server.pause('10/1');
    const alive = await get('/v1/commands?wait=25');
    expect(alive.status).toBe(200);
    const command = (await alive.json()) as { id: string };
    await post('/v1/results', { commandId: command.id, outcome: 'APPLIED', message: 'ok' });
    await expect(pausing).resolves.toMatchObject({ outcome: 'APPLIED' });
  });
});

describe('inicialização', () => {
  it('porta ocupada não lança: o motivo vai para o status', async () => {
    const blocker = createServer();
    await new Promise<void>((resolve) => blocker.listen(0, '127.0.0.1', resolve));
    const port = (blocker.address() as { port: number }).port;
    await boot({ port });
    expect(server.getStatus()).toMatchObject({ running: false, port: null });
    expect(server.getStatus().error).toMatch(/já está em uso/);
    await expect(server.pause('1/2')).rejects.toThrow(/já está em uso/);
    await new Promise((resolve) => blocker.close(resolve));
  });

  it('escuta só no loopback', async () => {
    await boot();
    expect(server.getStatus()).toMatchObject({ running: true, error: null });
    expect(base.startsWith('http://127.0.0.1:')).toBe(true);
  });
});
