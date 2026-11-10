// Teste de contrato: o cliente REAL da extensão contra o servidor REAL do app.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ExtensionBridgeServer } from '../src/infrastructure/bridge/extension-bridge-server.ts';
import { ping, pollOnce } from './bridge-client.js';

const CODE = 'codigo-de-teste-do-contrato';
let server;
let config;

/** A extensão só conta como conectada quando consulta comandos (o ping das opções não conta). */
const appear = () =>
  fetch(`http://127.0.0.1:${config.port}/v1/commands?wait=0`, {
    headers: { Authorization: `Bearer ${CODE}` },
  });

beforeEach(async () => {
  server = new ExtensionBridgeServer({
    port: 0,
    getPairingCode: async () => CODE,
    clock: { now: () => new Date() },
    longPollMs: 120,
    commandTimeoutMs: 1500,
  });
  await server.start();
  config = { port: server.getStatus().port, code: CODE };
});
afterEach(() => server.stop());

describe('extensão x app (contrato do protocolo v1)', () => {
  it('o ping reconhece o app e o código', async () => {
    expect(await ping(config)).toEqual({
      ok: true,
      message: 'Conectado ao app Kanban Automation.',
    });
    expect((await ping({ ...config, code: 'errado' })).message).toMatch(/recusado/);
  });

  it('recebe o pedido de pausa, executa e o app recebe o resultado', async () => {
    await appear(); // a extensão "aparece": consulta comandos
    const handled = [];
    const pause = async (ref) => {
      handled.push(ref);
      return { outcome: 'APPLIED', message: 'Pausado: R06' };
    };
    const [result, poll] = await Promise.all([
      server.pause('251847/397128'),
      pollOnce(config, pause),
    ]);
    expect(handled).toEqual(['251847/397128']);
    expect(poll).toMatchObject({ state: 'handled', outcome: 'APPLIED' });
    expect(result).toEqual({ outcome: 'APPLIED', message: 'Pausado: R06', httpStatus: null });
  });

  it('nada rodando chega ao app como ALREADY_IN_STATE', async () => {
    await appear();
    const pause = async () => ({ outcome: 'ALREADY_IN_STATE', message: 'Nada rodando' });
    const [result] = await Promise.all([server.pause('1/2'), pollOnce(config, pause)]);
    expect(result.outcome).toBe('ALREADY_IN_STATE');
  });

  it('erro dentro da extensão vira FAILED com a mensagem, sem derrubar o laço', async () => {
    await appear();
    const pause = async () => {
      throw new Error('Faça login no Kanboard');
    };
    const outcome = expect(server.pause('1/2')).rejects.toThrow('Faça login no Kanboard');
    const poll = await pollOnce(config, pause);
    await outcome;
    expect(poll).toMatchObject({ state: 'handled', outcome: 'FAILED' });
  });

  it('sem comando devolve idle', async () => {
    expect(await pollOnce(config, async () => ({ outcome: 'APPLIED', message: '' }))).toEqual({
      state: 'idle',
    });
  });

  it('código errado -> unauthorized; app fora do ar -> offline', async () => {
    expect((await pollOnce({ ...config, code: 'errado' }, async () => ({}))).state).toBe(
      'unauthorized',
    );
    await server.stop();
    expect((await pollOnce(config, async () => ({}))).state).toBe('offline');
  });

  it('comando fora do protocolo é ignorado como erro (nunca executado)', async () => {
    let executed = false;
    const fakeFetch = async () =>
      new Response(JSON.stringify({ id: 'x', action: 'RESUME', ref: '1/2' }), { status: 200 });
    const outcome = await pollOnce(config, async () => ((executed = true), {}), fakeFetch);
    expect(outcome.state).toBe('error');
    expect(executed).toBe(false);
  });
});
