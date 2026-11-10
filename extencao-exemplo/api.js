// Cliente da API JSON-RPC do Kanboard (/jsonrpc.php), autenticado com usuário + token da API.
// O token é guardado só em chrome.storage.local (nunca em sync) e nunca é logado.

import { BASE } from "./config.js";

const CHUNK = 40; // chamadas por envio em lote

/** { user, token } salvos nas Opções, ou null. */
export async function getCreds() {
  const { kbCreds } = await chrome.storage.local.get("kbCreds");
  return kbCreds?.user && kbCreds?.token ? kbCreds : null;
}

/**
 * Executa várias chamadas em lote.
 * calls: [{ method, params }] -> [{ result } | { error }] na mesma ordem.
 * Lança Error("token-invalido") em 401 e Error("kanboard HTTP n") em outros HTTP não-ok.
 */
export async function rpc(creds, calls, stats) {
  const out = [];
  for (let i = 0; i < calls.length; i += CHUNK) {
    const slice = calls.slice(i, i + CHUNK);
    const body = slice.map((c, k) => ({
      jsonrpc: "2.0",
      id: k + 1,
      method: c.method,
      params: c.params ?? {},
    }));
    const res = await fetch(`${BASE}/jsonrpc.php`, {
      method: "POST",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${creds.user}:${creds.token}`)}`,
      },
      body: JSON.stringify(body),
    });
    if (res.status === 401) throw new Error("token-invalido");
    if (!res.ok) throw new Error(`kanboard HTTP ${res.status}`);
    if (stats) stats.fetched += 1;
    const json = await res.json();
    const byId = new Map((Array.isArray(json) ? json : [json]).map((r) => [r.id, r]));
    for (let k = 0; k < slice.length; k++) {
      const r = byId.get(k + 1);
      out.push(r?.error ? { error: r.error.message ?? "erro" } : { result: r?.result });
    }
  }
  return out;
}

/** Uma chamada; lança Error com a mensagem do Kanboard se falhar. */
export async function rpcOne(creds, method, params, stats) {
  const [r] = await rpc(creds, [{ method, params }], stats);
  if (r.error) throw new Error(`${method}: ${r.error}`);
  return r.result;
}
