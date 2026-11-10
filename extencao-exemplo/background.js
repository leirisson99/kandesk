import { BASE, normalizeSettings } from "./config.js";
import { TTL, clearCache, isFresh, loadCache, saveCache } from "./cache.js";
import { getCreds, rpc, rpcOne } from "./api.js";
import { boardCandidates, loadCardEntries } from "./kanboard.js";
import { RH_BASE, RH_PATH, isRhPanel, parseRhNet, rhWorkState } from "./rh.js";
import {
  evaluate,
  isLoginPage,
  isMe,
  isWorkTime,
  parseConfirmForm,
  parseSubtasks,
} from "./logic.js";

const ICON = chrome.runtime.getURL("icon.png");
const PAUSE_COMMENT = "pausa";
const TITLE = "LEMBRETE TRAMITE KANBOARD";

async function getConfig() {
  const { settings } = await chrome.storage.sync.get("settings");
  return normalizeSettings(settings);
}

/** Página do Kanboard com a sessão do navegador (usada só para pausar; a leitura é pela API). */
async function getHtml(path) {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" });
  const html = await res.text();
  if (isLoginPage(res.url, html)) throw new Error("login");
  return html;
}

function notify(id, title, message, ref) {
  chrome.notifications.create(id, {
    type: "basic",
    iconUrl: ICON,
    title,
    message,
    requireInteraction: true,
    contextMessage: ref ? "Clique para abrir o card" : undefined,
  });
  if (ref) chrome.storage.session.set({ [`task:${id}`]: ref });
}

/** Evita repetir o mesmo aviso antes de renotifyEveryMinutes. */
async function shouldNotify(key, cfg) {
  const { sent = {} } = await chrome.storage.local.get("sent");
  const now = Date.now();
  if (sent[key] && now - sent[key] < cfg.renotifyEveryMinutes * 60_000)
    return false;
  sent[key] = now;
  for (const k of Object.keys(sent))
    if (now - sent[k] > 24 * 3_600_000) delete sent[k];
  await chrome.storage.local.set({ sent });
  return true;
}

/** Abre a janela de confirmação da pausa, preenche a observação e envia. */
async function pauseSubtask(href, result) {
  const modal = await fetch(`${BASE}${href}`, {
    credentials: "include",
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });
  const html = await modal.text();
  const form = parseConfirmForm(html, PAUSE_COMMENT);
  if (!form) {
    result.note = "formulário de confirmação não encontrado";
    result.modalSnippet = html.replace(/\s+/g, " ").slice(0, 800);
    return false;
  }
  result.commentField = form.commentField || "(nenhum campo de observação achado)";
  result.fields = [...form.params.keys()];
  const res = await fetch(new URL(form.action || href, BASE).href, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: form.params.toString(),
  });
  Object.assign(result, { httpStatus: res.status, finalUrl: res.url });
  return res.ok;
}

/**
 * Executa uma checagem e guarda o relatório (para depuração nas Opções).
 * force = ignora o cache (botão "Checar agora" / clique no ícone).
 */
async function check({ force = false } = {}) {
  const report = { at: new Date().toLocaleString("pt-BR"), force };
  try {
    await runCheck(report, force);
  } catch (e) {
    report.error = String(e?.message ?? e);
  }
  console.log("[card-guard]", report);
  await chrome.storage.local.set({ lastReport: report });
  return report;
}

/** Painel do RH Net (batidas do dia), com cache curto. Lança "rh-login" se a sessão expirou. */
async function loadRh(cache, force) {
  const today = new Date().toDateString();
  if (!force && cache.rh?.day === today && isFresh(cache.rh.at, TTL.rh)) return cache.rh.data;
  const res = await fetch(`${RH_BASE}${RH_PATH}`, { credentials: "include" });
  const html = await res.text();
  if (!isRhPanel(html)) throw new Error("rh-login");
  const data = parseRhNet(html);
  cache.rh = { at: Date.now(), day: today, data };
  return data;
}

/** Erro de API -> mensagem para o relatório (e aviso quando é token). */
async function reportApiError(e, report, cfg) {
  if (e?.message === "token-invalido") {
    report.error = "Kanboard recusou o usuário/token da API (401). Confira nas Opções.";
    if (await shouldNotify("token", cfg))
      notify("token", TITLE, "O Kanboard recusou o usuário/token da API. Atualize-os nas Opções da extensão.");
  } else {
    report.error = String(e?.message ?? e);
  }
}

async function runCheck(report, force) {
  const cfg = await getConfig();
  const cache = await loadCache();
  const stats = { hits: 0, fetched: 0 };
  report.cache = stats;

  // Expediente: batidas do RH Net (dinâmico) ou, se indisponível, os horários manuais.
  let workTime = isWorkTime(new Date(), cfg);
  report.schedule = { source: "manual" };
  if (cfg.useRhNet) {
    try {
      const rh = await loadRh(cache, force);
      const state = rhWorkState(new Date(), rh, cfg);
      workTime = state.working;
      report.schedule = {
        source: "rhnet",
        reason: state.reason,
        punches: rh.punches.map((p) => `${p.time} ${p.type}`),
        quadro: rh.quadro,
        forecastExit: rh.forecastExit,
      };
    } catch (e) {
      report.schedule = { source: "manual", rhError: String(e?.message ?? e) };
      if (e?.message === "rh-login" && (await shouldNotify("rh-login", cfg)))
        notify("rh-login", TITLE, "Sessão do RH Net expirada: usando os horários manuais. Faça login no RH Net para o expediente dinâmico.");
    }
  }
  report.workTime = workTime;

  // Fora do expediente e sem cronômetro meu conhecido: reescaneia só de tempos em tempos.
  if (!force && !workTime && cache.myOpen.length === 0 && isFresh(cache.lastScan, TTL.offHoursIdle)) {
    report.skipped = "fora do expediente, sem cronômetro aberto (usando cache)";
    await saveCache(cache);
    return;
  }

  // Credenciais da API do Kanboard (usuário + token), salvas nas Opções.
  const creds = await getCreds();
  if (!creds) {
    report.error = "Kanboard não configurado: informe o usuário e o token da API nas Opções.";
    if (await shouldNotify("no-creds", cfg))
      notify("no-creds", TITLE, "Configure o usuário e o token da API do Kanboard nas Opções da extensão.");
    await saveCache(cache);
    return;
  }

  // 1) Usuário e sprints a monitorar (cache longo)
  let me = cache.me;
  let sprintIds = cfg.sprintIds.split(/[\s,;]+/).filter((x) => /^\d+$/.test(x));
  try {
    if (force || !isFresh(me?.at, TTL.me)) {
      const user = await rpcOne(creds, "getMe", {}, stats);
      me = cache.me = { at: Date.now(), id: String(user.id), name: user.name, username: user.username };
    } else {
      stats.hits += 1;
    }
    if (!sprintIds.length) {
      if (force || !isFresh(cache.sprints?.at, TTL.sprints)) {
        const projects = await rpcOne(creds, "getMyProjects", {}, stats);
        cache.sprints = {
          at: Date.now(),
          ids: projects.filter((p) => String(p.is_active) === "1").map((p) => String(p.id)),
        };
      } else {
        stats.hits += 1;
      }
      sprintIds = cache.sprints.ids;
    }
  } catch (e) {
    await reportApiError(e, report, cfg);
    return;
  }
  const myName = cfg.myName || me.name;
  report.myName = myName;
  report.sprints = sprintIds;

  // 2) Quadros (um envio em lote para os que venceram o cache); só guarda cards de colunas monitoradas
  report.sprintErrors = {};
  try {
    const stale = sprintIds.filter((sid) => force || !isFresh(cache.boards[sid]?.at, TTL.board));
    if (stale.length) {
      const boards = await rpc(
        creds,
        stale.map((sid) => ({ method: "getBoard", params: { project_id: Number(sid) } })),
        stats,
      );
      stale.forEach((sid, i) => {
        if (boards[i].error) report.sprintErrors[sid] = boards[i].error;
        else cache.boards[sid] = { at: Date.now(), cards: boardCandidates(boards[i].result, cfg) };
      });
    }
    stats.hits += sprintIds.length - stale.length;
  } catch (e) {
    await reportApiError(e, report, cfg);
    return;
  }
  for (const sid of Object.keys(cache.boards)) if (!sprintIds.includes(sid)) delete cache.boards[sid];
  const candidates = sprintIds.flatMap((sid) =>
    (cache.boards[sid]?.cards ?? []).map((c) => ({ ...c, projectId: sid, ref: `${sid}/${c.taskId}` })),
  );

  // 3) Cronômetros dos cards (cache curto; sempre fresco onde há cronômetro meu)
  const loadEntries = async (list) => {
    const map = await loadCardEntries({
      creds,
      cards: list,
      me,
      myName,
      spentCache: cache.spent,
      spentTtl: TTL.spent,
      stats,
    });
    for (const c of list) cache.tracking[c.taskId] = { at: Date.now(), entries: map.get(c.taskId) };
  };
  let cards;
  let alerts;
  let toPause;
  try {
    const needs = (c) => {
      const cached = cache.tracking[c.taskId];
      const ttl = cache.myOpen.includes(c.taskId) ? 0 : TTL.tracking;
      return force || !cached || !isFresh(cached.at, ttl);
    };
    const stale = candidates.filter(needs);
    await loadEntries(stale);
    stats.hits += candidates.length - stale.length;
    const staleIds = new Set(stale.map((c) => c.taskId));
    cards = candidates.map((c) => ({
      ...c,
      entries: cache.tracking[c.taskId].entries,
      fromCache: !staleIds.has(c.taskId),
    }));

    ({ alerts, toPause } = evaluate({ cards, myName, workTime, cfg }));

    // Antes de agir (avisar/pausar), confirma com dados frescos o que veio do cache.
    if ((alerts.length || toPause.length) && cards.some((c) => c.fromCache)) {
      const cached = cards.filter((c) => c.fromCache);
      await loadEntries(cached);
      for (const c of cached) {
        c.entries = cache.tracking[c.taskId].entries;
        c.fromCache = false;
      }
      ({ alerts, toPause } = evaluate({ cards, myName, workTime, cfg }));
      report.reverified = true;
    }
  } catch (e) {
    await reportApiError(e, report, cfg);
    return;
  }
  report.alerts = alerts.map((a) => a.message);
  report.toPause = toPause.map((p) => p.title);

  // Limpa do cache o que saiu das colunas monitoradas e guarda o estado.
  const ids = new Set(candidates.map((c) => c.taskId));
  for (const id of Object.keys(cache.tracking)) if (!ids.has(id)) delete cache.tracking[id];
  cache.myOpen = cards
    .filter((c) => c.entries.some((e) => !e.end && isMe(e.user, myName)))
    .map((c) => c.taskId);
  cache.lastScan = Date.now();
  await saveCache(cache);

  report.cards = cards.map((c) => ({
    ref: c.ref,
    column: c.columnName,
    openTimers: c.entries.filter((e) => !e.end).map((e) => e.user),
    lastUser: c.entries.reduce((a, b) => (b.start > (a?.start ?? 0) ? b : a), null)?.user,
  }));

  for (const a of alerts)
    if (await shouldNotify(a.key, cfg)) notify(a.key, TITLE, a.message, a.ref);

  if (workTime) {
    await resumeReminder();
    return;
  }

  // Pausa: o Kanboard exige o formulário com observação, que só existe na interface web
  // (usa a sessão do navegador). Sem sessão, avisa para pausar manualmente.
  const paused = [];
  report.pauseResults = [];
  for (const p of toPause) {
    const card = cards.find((c) => c.ref === p.ref);
    const label = `${p.title} – ${p.subtaskTitle}`;
    const result = { card: p.ref, wanted: p.subtaskTitle };
    report.pauseResults.push(result);

    let subtask;
    if (cfg.autoPause) {
      try {
        const pageHtml = await getHtml(`/sprint/${card.projectId}/solicitacao/${p.taskId}`);
        const running = parseSubtasks(pageHtml).filter((s) => s.running && s.pauseHref);
        result.runningFound = running.map((s) => s.title);
        // Casa pelo título; se só há um requisito rodando com link de pausa, usa ele.
        subtask =
          running.find((s) => s.title === p.subtaskTitle) ??
          (running.length === 1 ? running[0] : undefined);
      } catch (e) {
        result.note =
          e.message === "login"
            ? "pausa automática precisa da sessão do Kanboard aberta no navegador"
            : String(e?.message ?? e);
      }
    }

    if (subtask && (await pauseSubtask(subtask.pauseHref, result))) {
      paused.push({ ref: p.ref, title: label });
      delete cache.tracking[p.taskId]; // força reler os cronômetros na próxima checagem
      await saveCache(cache);
    } else if (await shouldNotify(`offhours:${p.ref}`, cfg)) {
      result.note ??= cfg.autoPause ? "link de pausa não encontrado" : "auto-pausa desligada";
      notify(`offhours:${p.ref}`, TITLE, `${label} ainda está com o cronômetro rodando. Pause manualmente.`, p.ref);
    }
  }
  if (paused.length) {
    const { pausedByUs = [] } = await chrome.storage.local.get("pausedByUs");
    await chrome.storage.local.set({ pausedByUs: [...pausedByUs, ...paused] });
    notify(`paused:${Date.now()}`, TITLE, paused.map((p) => p.title).join("\n"), paused[0].ref);
  }
}

/** Na volta do expediente/almoço, lembra o que foi pausado pela extensão. */
async function resumeReminder() {
  const { pausedByUs = [] } = await chrome.storage.local.get("pausedByUs");
  if (!pausedByUs.length) return;
  await chrome.storage.local.set({ pausedByUs: [] });
  notify(
    `resume:${Date.now()}`,
    TITLE,
    `Pausados por mim:\n${pausedByUs.map((p) => p.title).join("\n")}`,
    pausedByUs[0].ref,
  );
}

/** Confere usuário + token salvos (botão "Testar conexão" das Opções). */
async function testKanboard() {
  const creds = await getCreds();
  if (!creds) return { ok: false, error: "Informe o usuário de login e o token da API." };
  try {
    const u = await rpcOne(creds, "getMe", {});
    return { ok: true, name: u.name, username: u.username };
  } catch (e) {
    return {
      ok: false,
      error: e.message === "token-invalido" ? "Usuário ou token recusado pelo Kanboard (401)." : String(e.message),
    };
  }
}

async function schedule() {
  const cfg = await getConfig();
  await chrome.alarms.create("tick", { periodInMinutes: cfg.checkEveryMinutes });
}

chrome.runtime.onInstalled.addListener(() => {
  schedule();
  check({ force: true }).catch(console.error);
});
chrome.runtime.onStartup.addListener(() => {
  schedule();
  check({ force: true }).catch(console.error);
});
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === "tick") check().catch(console.error);
});
chrome.action.onClicked.addListener(() => check({ force: true }).catch(console.error));
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg === "check") check({ force: true }).then(sendResponse);
  if (msg === "clearCache") clearCache().then(() => sendResponse(true));
  if (msg === "testKanboard") testKanboard().then(sendResponse);
  if (msg === "testNotify")
    notify("test", "Card Guard", "Notificação de teste: se você vê isso, as notificações funcionam.");
  return ["check", "clearCache", "testKanboard"].includes(msg);
});
chrome.storage.onChanged.addListener((_c, area) => {
  if (area === "sync") schedule();
});
chrome.notifications.onClicked.addListener(async (id) => {
  const { [`task:${id}`]: ref } = await chrome.storage.session.get(`task:${id}`);
  const [sprint, task] = (ref ?? "").split("/");
  chrome.tabs.create({
    url: task ? `${BASE}/sprint/${sprint}/solicitacao/${task}` : `${BASE}/dashboard`,
  });
  chrome.notifications.clear(id);
});
