// Funções puras (sem chrome.* nem fetch) para poderem ser testadas em Node.

const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const text = (html) =>
  decode(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

const normalize = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function isLoginPage(url, html) {
  return /\/login(\?|$)/.test(url) || /<title>\s*Login\s*<\/title>/i.test(html);
}

/**
 * Classifica a coluna pelo nome: "paused" (PAUSADO/PARADO), "working" (EM ...) ou null.
 * Os padrões (regex, sem acento e maiúsculo) vêm de cfg.
 */
export function classifyColumn(name, cfg) {
  const n = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();
  if (new RegExp(cfg.pausedColumnPattern, "i").test(n)) return "paused";
  if (new RegExp(cfg.workingColumnPattern, "i").test(n)) return "working";
  return null;
}

/** Requisitos/atividades da página de um card. */
export function parseSubtasks(html) {
  const parts = html.split('<tr data-subtask-id="').slice(1);
  return parts.map((part) => {
    const row = part.split("</tr>")[0];
    const id = /^(\d+)"/.exec(part)?.[1] ?? "";
    const title = text(/class="subtask-title"[^>]*>([\s\S]*?)<\/span>/.exec(row)?.[1] ?? "");
    const statusClass = /class="(subtask-status-[\w-]+)"/.exec(row)?.[1] ?? "";
    const pause = [...row.matchAll(/<a href="([^"]+)"[^>]*>[^<]*<i[^>]*><\/i>\s*(Pausar[^<]*)</g)].map(
      (m) => decode(m[1]),
    )[0];
    return {
      id,
      title,
      statusClass,
      // dev-inprogress, test-inprogress, ...
      running: /inprogress/.test(statusClass),
      pauseHref: pause ?? null,
    };
  });
}

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export function isWorkTime(date, cfg) {
  if (!cfg.days.includes(date.getDay())) return false;
  const now = date.getHours() * 60 + date.getMinutes();
  return cfg.workIntervals.some((i) => now >= toMin(i.start) && now < toMin(i.end));
}

export const isMe = (user, myName) => {
  if (!myName || !user) return false;
  const a = normalize(user);
  const n = normalize(myName);
  return a.includes(n) || n.includes(a);
};

/**
 * Decide o que fazer.
 * - "Tramitado" = tenho cronômetro aberto (registro sem Fim) no card.
 * - Card é "meu" se tenho cronômetro aberto ou o registro de tempo mais recente é meu.
 * cards: [{ ref, taskId, title, columnName, columnKind, entries }] (apenas colunas monitoradas)
 *   ref = "<sprint>/<card>"; columnKind = "working" | "paused"
 * Retorna { alerts: [{key, ref, message}], toPause: [{ref, taskId, title, subtaskTitle}] }
 */
export function evaluate({ cards, myName, workTime, cfg }) {
  const alerts = [];
  const toPause = [];

  // Em expediente sem NENHUM cronômetro meu aberto: avisa para conferir
  // (pode ser que eu realmente não tenha nada em andamento).
  const nothingRunning = !cards.some((c) =>
    c.entries.some((e) => !e.end && isMe(e.user, myName)),
  );
  if (workTime && nothingRunning) {
    alerts.push({
      key: "nothing-running",
      ref: "",
      message: "Você não tem nenhum card em andamento (nenhum cronômetro seu rodando). Confira se está certo.",
    });
  }

  for (const card of cards) {
    const openMine = card.entries.filter((e) => !e.end && isMe(e.user, myName));
    const latest = card.entries.reduce((a, b) => (b.start > (a?.start ?? 0) ? b : a), null);
    const isMine = openMine.length > 0 || (latest && isMe(latest.user, myName));
    if (!isMine) continue;
    const label = `#${card.taskId} ${card.title}`;

    if (!workTime) {
      for (const e of openMine)
        toPause.push({ ref: card.ref, taskId: card.taskId, title: label, subtaskTitle: e.subtaskTitle });
      continue;
    }

    // Quando nada roda, o aviso geral acima já cobre; evita uma notificação por card.
    if (!nothingRunning && card.columnKind === "working" && openMine.length === 0) {
      alerts.push({
        key: `idle:${card.ref}`,
        ref: card.ref,
        message: `${label} está em ${card.columnName}, mas você não está com o cronômetro rodando nele.`,
      });
    }
    if (card.columnKind === "paused" && openMine.length > 0) {
      alerts.push({
        key: `running-paused:${card.ref}`,
        ref: card.ref,
        message: `${label} está em ${card.columnName}, mas o requisito "${openMine[0].subtaskTitle}" está com o cronômetro rodando.`,
      });
    }
  }
  return { alerts, toPause };
}

const attr = (tag, name) =>
  new RegExp(String.raw`(?:^|\s)${name}\s*=\s*"([^"]*)"`, "i").exec(tag)?.[1] ?? "";

/**
 * Lê o formulário da janela de confirmação (js-modal-confirm) e monta o envio,
 * preenchendo o campo de observação com `comment`.
 * Retorna { action, params, commentField } ou null se não houver formulário.
 */
export function parseConfirmForm(html, comment) {
  const form = /<form\b([^>]*)>([\s\S]*?)<\/form>/i.exec(html);
  if (!form) return null;
  const action = decode(attr(form[1], "action"));
  const params = new URLSearchParams();
  let commentField = "";

  for (const m of form[2].matchAll(/<input\b[^>]*>/gi)) {
    const name = attr(m[0], "name");
    const type = (attr(m[0], "type") || "text").toLowerCase();
    if (!name || ["submit", "button", "reset", "file"].includes(type)) continue;
    if (["checkbox", "radio"].includes(type) && !/\bchecked\b/i.test(m[0])) continue;
    params.set(name, decode(attr(m[0], "value")));
    if (type === "text" && !commentField && /coment|observ|motivo|note|descr/i.test(name))
      commentField = name;
  }
  const textarea = /<textarea\b([^>]*)>/i.exec(form[2]);
  if (textarea) commentField = attr(textarea[1], "name") || commentField;
  if (commentField) params.set(commentField, comment);

  return { action, params, commentField };
}
