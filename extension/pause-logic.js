// Lógica pura da ponte com o app Kanban Automation (sem chrome.* nem fetch), testável em Node.
// O contrato espelha src/shared/contracts/bridge.ts do app (protocolo versão 1).

export const BRIDGE_PROTOCOL_VERSION = 1;
export const DEFAULT_PORT = 47615;
export const REF_PATTERN = /^(\d+)\/(\d+)$/;

/** "10526/254251" -> { projectId: "10526", taskId: "254251" }; null se inválida. */
export function parseRef(ref) {
  const match = REF_PATTERN.exec(String(ref ?? ''));
  return match ? { projectId: match[1], taskId: match[2] } : null;
}

/** Valida um comando vindo do app. Na v1 só PAUSE existe. Devolve o comando ou null. */
export function parseCommand(value) {
  if (!value || typeof value !== 'object') return null;
  const { id, action, ref } = value;
  if (typeof id !== 'string' || id.length === 0 || id.length > 64) return null;
  if (action !== 'PAUSE') return null;
  if (!parseRef(ref)) return null;
  return { id, action, ref };
}

/** Porta válida (1024-65535) ou null. */
export function validPort(value) {
  const port = Number(value);
  return Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : null;
}

const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/**
 * Resultado enviado ao app depois de tentar pausar.
 * running: quantos requisitos meus estavam rodando; pausedTitles/failures: o que foi feito;
 * stillRunning: quantos continuam rodando na conferência final.
 */
export function summarizePause({ running, pausedTitles, failures, stillRunning, hint = '' }) {
  if (running === 0) {
    return {
      outcome: 'ALREADY_IN_STATE',
      message: 'Nenhum requisito seu estava com o cronômetro rodando neste card.',
    };
  }
  if (failures.length > 0) {
    const done = pausedTitles.length ? `Pausado: ${pausedTitles.join(', ')}. ` : '';
    return { outcome: 'FAILED', message: clip(`${done}Falhou: ${failures.join('; ')}`, 500) };
  }
  if (stillRunning > 0) {
    const detail = hint ? ` Detalhes: ${hint}` : '';
    return {
      outcome: 'FAILED',
      message: clip(
        `O Kanboard aceitou o pedido, mas ${stillRunning} cronômetro(s) seguem rodando.${detail}`,
        500,
      ),
    };
  }
  return { outcome: 'APPLIED', message: clip(`Pausado: ${pausedTitles.join(', ')}`, 500) };
}

/** Trecho curto e útil da resposta do Kanboard: texto/JSON curto, ou a mensagem de alerta do HTML. */
export function responseSnippet(body) {
  const raw = String(body ?? '').trim();
  if (!raw) return '';
  if (!raw.startsWith('<')) return clip(raw.replace(/\s+/g, ' '), 160);
  const alert =
    /<(div|p|span|li)\b[^>]*class="[^"]*(?:alert|flash|error|danger|warning)[^"]*"[^>]*>([\s\S]*?)<\/\1>/i.exec(
      raw,
    );
  if (!alert?.[2]) return '';
  return clip(
    alert[2]
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
    160,
  );
}

/**
 * Resumo, sem valores nem segredos, do envio do formulário de pausa: caminho, status HTTP,
 * nomes dos campos e o que o Kanboard respondeu. Serve para diagnosticar quando "aceitou" mas não pausou.
 */
export function describeAttempt({ action, httpStatus, fields, body }) {
  const path = String(action ?? '').split('?')[0] || '(sem action)';
  const reply = responseSnippet(body);
  return `POST ${path} HTTP ${httpStatus}; campos: ${fields.join(', ') || '(nenhum)'}${reply ? `; resposta: ${reply}` : ''}`;
}
