// Ponte com o app Kanban Automation: consulta o app (long-poll) e executa os pedidos de pausa.
// Config em chrome.storage.local ("bridge": { port, code }); o código nunca é logado.
// A ponte está ligada sempre que houver um código de pareamento; para desligar, apague o código.

import { pollOnce, ping } from './bridge-client.js';
import { DEFAULT_PORT, validPort } from './pause-logic.js';

const KEY = 'bridge';
const STATE_KEY = 'bridgeState';
const OFFLINE_BACKOFF_MS = 15_000;
let polling = false;

export async function getBridgeConfig() {
  const { [KEY]: saved } = await chrome.storage.local.get(KEY);
  return {
    port: validPort(saved?.port) ?? DEFAULT_PORT,
    code: typeof saved?.code === 'string' ? saved.code.trim() : '',
  };
}

const setState = (state) => chrome.storage.local.set({ [STATE_KEY]: { ...state, at: Date.now() } });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mantém a consulta ao app enquanto a ponte estiver ligada. Chamada na inicialização, ao salvar
 * as opções e a cada minuto pelo alarme (o service worker do Chrome pode adormecer).
 */
export async function ensureBridge(pause) {
  if (polling) return;
  polling = true;
  try {
    for (;;) {
      const config = await getBridgeConfig();
      if (!config.code) {
        await setState({
          ok: false,
          message: 'Ponte desligada: informe o código de pareamento nas opções.',
        });
        return;
      }
      const outcome = await pollOnce(config, pause);
      if (outcome.state === 'idle' || outcome.state === 'handled') {
        await setState({ ok: true, message: 'Conectado ao app.' });
      } else if (outcome.state === 'unauthorized') {
        await setState({ ok: false, message: 'Código de pareamento recusado pelo app.' });
        return; // não insiste com o código errado; o usuário corrige nas opções
      } else {
        await setState({ ok: false, message: 'App indisponível; tentando de novo.' });
        await sleep(OFFLINE_BACKOFF_MS);
      }
    }
  } finally {
    polling = false;
  }
}

export async function testBridge() {
  const config = await getBridgeConfig();
  if (!config.code) return { ok: false, message: 'Informe o código de pareamento.' };
  return ping(config);
}
