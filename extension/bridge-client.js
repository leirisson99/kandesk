// Cliente da ponte: conversa com o servidor local do app Kanban Automation (somente 127.0.0.1).
// Sem chrome.*; o fetch é injetável para testes.

import { BRIDGE_PROTOCOL_VERSION, parseCommand } from './pause-logic.js';

export const POLL_WAIT_SECONDS = 25;

const baseUrl = (port) => `http://127.0.0.1:${port}`;
const authHeaders = (code) => ({ Authorization: `Bearer ${code}` });

/**
 * Uma consulta ao app. Se vier um comando, executa `pause(ref)` e devolve o resultado ao app.
 * Estados: "idle" (nada a fazer), "handled", "unauthorized" (código recusado), "offline", "error".
 */
export async function pollOnce({ port, code }, pause, fetchImpl = fetch) {
  let res;
  try {
    res = await fetchImpl(`${baseUrl(port)}/v1/commands?wait=${POLL_WAIT_SECONDS}`, {
      headers: authHeaders(code),
      cache: 'no-store',
    });
  } catch {
    return { state: 'offline' };
  }
  if (res.status === 204) return { state: 'idle' };
  if (res.status === 401 || res.status === 403) return { state: 'unauthorized' };
  if (!res.ok) return { state: 'error' };

  let command;
  try {
    command = parseCommand(await res.json());
  } catch {
    return { state: 'error' };
  }
  if (!command) return { state: 'error' };

  let result;
  try {
    result = await pause(command.ref);
  } catch (error) {
    result = { outcome: 'FAILED', message: String(error?.message ?? error) };
  }
  const body = {
    commandId: command.id,
    outcome: result.outcome,
    message: String(result.message ?? '').slice(0, 500),
  };
  try {
    await fetchImpl(`${baseUrl(port)}/v1/results`, {
      method: 'POST',
      headers: { ...authHeaders(code), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { state: 'offline' };
  }
  return { state: 'handled', commandId: command.id, outcome: body.outcome };
}

/** Teste das opções: o app responde e o código confere? */
export async function ping({ port, code }, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(`${baseUrl(port)}/v1/hello`, {
      headers: authHeaders(code),
      cache: 'no-store',
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: 'Código de pareamento recusado pelo app.' };
    }
    if (!res.ok) return { ok: false, message: `O app respondeu com erro HTTP ${res.status}.` };
    const info = await res.json();
    if (info?.protocol !== BRIDGE_PROTOCOL_VERSION) {
      return { ok: false, message: 'Versão do protocolo diferente: atualize o app e a extensão.' };
    }
    return { ok: true, message: 'Conectado ao app Kanban Automation.' };
  } catch {
    return { ok: false, message: 'Não foi possível falar com o app. Ele está aberto?' };
  }
}
