import { describe, expect, it } from 'vitest';
import { AuthError, CommunicationError } from '@application/errors';
import { KanbanAuthApiClient } from './kanban-auth-client';
import { KanbanJsonRpcClient } from './jsonrpc-client';

const credentials = { username: 'maria', token: 'SEGREDO-123' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function clientWith(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fakeFetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return handler(url, init);
  }) as unknown as typeof fetch;
  return { rpc: new KanbanJsonRpcClient({ baseUrl: 'https://kb.test/', fetch: fakeFetch }), calls };
}

describe('KanbanJsonRpcClient', () => {
  it('envia Basic auth sem cookies para /jsonrpc.php', async () => {
    const { rpc, calls } = clientWith(() => jsonResponse([{ jsonrpc: '2.0', id: 1, result: 7 }]));
    await expect(rpc.call(credentials, 'getMe')).resolves.toBe(7);

    const [sent] = calls;
    expect(sent?.url).toBe('https://kb.test/jsonrpc.php');
    expect(sent?.init.credentials).toBe('omit');
    const expected = Buffer.from('maria:SEGREDO-123').toString('base64');
    expect((sent?.init.headers as Record<string, string>).Authorization).toBe(`Basic ${expected}`);
  });

  it('trata 401 como AuthError sem expor o token', async () => {
    const { rpc } = clientWith(() => jsonResponse({}, 401));
    const error = await rpc.call(credentials, 'getMe').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AuthError);
    expect((error as Error).message).not.toContain('SEGREDO-123');
  });

  it('trata 403 como AuthError', async () => {
    const { rpc } = clientWith(() => jsonResponse({}, 403));
    await expect(rpc.call(credentials, 'x')).rejects.toBeInstanceOf(AuthError);
  });

  it('trata HTTP 5xx como CommunicationError', async () => {
    const { rpc } = clientWith(() => jsonResponse({}, 502));
    await expect(rpc.call(credentials, 'x')).rejects.toThrow(/HTTP 502/);
  });

  it('trata falha de rede como CommunicationError sem repassar a causa', async () => {
    const { rpc } = clientWith(() => {
      throw new TypeError('fetch failed: Authorization Basic SEGREDO');
    });
    const error = await rpc.call(credentials, 'x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CommunicationError);
    expect((error as Error).message).not.toContain('SEGREDO');
  });

  it('trata o tempo esgotado como CommunicationError', async () => {
    const { rpc } = clientWith(() => {
      throw Object.assign(new Error('timeout'), { name: 'TimeoutError' });
    });
    await expect(rpc.call(credentials, 'x')).rejects.toThrow(/Tempo esgotado/);
  });

  it('rejeita corpo que não é JSON-RPC', async () => {
    const { rpc } = clientWith(() => jsonResponse({ qualquer: 'coisa' }));
    await expect(rpc.call(credentials, 'x')).rejects.toThrow(/inesperada/);
  });

  it('casa as respostas do lote pelo id, mesmo fora de ordem, e isola erros por chamada', async () => {
    const { rpc } = clientWith(() =>
      jsonResponse([
        { jsonrpc: '2.0', id: 2, error: { message: 'Not found' } },
        { jsonrpc: '2.0', id: 1, result: 'a' },
      ]),
    );
    const results = await rpc.callMany(credentials, [{ method: 'm1' }, { method: 'm2' }]);
    expect(results).toEqual([
      { ok: true, result: 'a' },
      { ok: false, message: 'Not found' },
    ]);
  });

  it('divide lotes grandes em envios de até 40 chamadas', async () => {
    const { rpc, calls } = clientWith((_url, init) => {
      const sent = JSON.parse(String(init.body)) as { id: number }[];
      return jsonResponse(sent.map((c) => ({ jsonrpc: '2.0', id: c.id, result: c.id })));
    });
    const many = Array.from({ length: 85 }, () => ({ method: 'getMe' }));
    const results = await rpc.callMany(credentials, many);
    expect(results).toHaveLength(85);
    expect(calls).toHaveLength(3);
  });

  it('lança CommunicationError quando a chamada única volta com erro', async () => {
    const { rpc } = clientWith(() =>
      jsonResponse([{ jsonrpc: '2.0', id: 1, error: { message: 'Method not found' } }]),
    );
    await expect(rpc.call(credentials, 'inexistente')).rejects.toThrow(/Method not found/);
  });
});

describe('KanbanAuthApiClient', () => {
  it('devolve só id, username e name, descartando segredos do getMe', async () => {
    const { rpc } = clientWith(() =>
      jsonResponse([
        {
          jsonrpc: '2.0',
          id: 1,
          result: {
            id: 451,
            username: 'maria',
            name: 'Maria',
            email: 'maria@example.com',
            api_access_token: 'SEGREDO-123',
            twofactor_secret: 'OUTRO-SEGREDO',
          },
        },
      ]),
    );
    const user = await new KanbanAuthApiClient(rpc).verify(credentials);
    expect(user).toEqual({ id: '451', username: 'maria', name: 'Maria' });
    expect(JSON.stringify(user)).not.toContain('SEGREDO');
  });

  it('falha de forma explícita se o getMe vier em formato inesperado', async () => {
    const { rpc } = clientWith(() => jsonResponse([{ jsonrpc: '2.0', id: 1, result: false }]));
    await expect(new KanbanAuthApiClient(rpc).verify(credentials)).rejects.toBeInstanceOf(
      CommunicationError,
    );
  });
});
