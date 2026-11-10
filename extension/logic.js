// Funções puras (sem chrome.* nem fetch) para poderem ser testadas em Node.

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const text = (html) =>
  decode(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function isLoginPage(url, html) {
  return /\/login(\?|$)/.test(url) || /<title>\s*Login\s*<\/title>/i.test(html);
}

/**
 * Classifica a coluna pelo nome: "paused" (PAUSADO/PARADO), "working" (EM ...) ou null.
 * Os padrões (regex, sem acento e maiúsculo) vêm de cfg.
 */
export function classifyColumn(name, cfg) {
  const n = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
  if (new RegExp(cfg.pausedColumnPattern, 'i').test(n)) return 'paused';
  if (new RegExp(cfg.workingColumnPattern, 'i').test(n)) return 'working';
  return null;
}

/** Requisitos/atividades da página de um card. */
export function parseSubtasks(html) {
  const parts = html.split('<tr data-subtask-id="').slice(1);
  return parts.map((part) => {
    const row = part.split('</tr>')[0];
    const id = /^(\d+)"/.exec(part)?.[1] ?? '';
    const title = text(/class="subtask-title"[^>]*>([\s\S]*?)<\/span>/.exec(row)?.[1] ?? '');
    const statusClass = /class="(subtask-status-[\w-]+)"/.exec(row)?.[1] ?? '';
    const pause = [
      ...row.matchAll(/<a href="([^"]+)"[^>]*>[^<]*<i[^>]*><\/i>\s*(Pausar[^<]*)</g),
    ].map((m) => decode(m[1]))[0];
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
  const [h, m] = hhmm.split(':').map(Number);
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
export function evaluate({ cards, myName, workTime }) {
  const alerts = [];
  const toPause = [];

  // Em expediente sem NENHUM cronômetro meu aberto: avisa para conferir
  // (pode ser que eu realmente não tenha nada em andamento).
  const nothingRunning = !cards.some((c) => c.entries.some((e) => !e.end && isMe(e.user, myName)));
  if (workTime && nothingRunning) {
    alerts.push({
      key: 'nothing-running',
      ref: '',
      message:
        'Você não tem nenhum card em andamento (nenhum cronômetro seu rodando). Confira se está certo.',
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
        toPause.push({
          ref: card.ref,
          taskId: card.taskId,
          title: label,
          subtaskTitle: e.subtaskTitle,
        });
      continue;
    }

    // Quando nada roda, o aviso geral acima já cobre; evita uma notificação por card.
    if (!nothingRunning && card.columnKind === 'working' && openMine.length === 0) {
      alerts.push({
        key: `idle:${card.ref}`,
        ref: card.ref,
        message: `${label} está em ${card.columnName}, mas você não está com o cronômetro rodando nele.`,
      });
    }
    if (card.columnKind === 'paused' && openMine.length > 0) {
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
  new RegExp(String.raw`(?:^|\s)${name}\s*=\s*"([^"]*)"`, 'i').exec(tag)?.[1] ?? '';

const labelOf = (inner) => text(inner);

/** Opções de um <select>: [{ value, label, selected }]. Sem value, vale o texto. */
function parseOptions(selectHtml) {
  return [...selectHtml.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)].map((m) => {
    const label = labelOf(m[2]);
    const hasValue = /(?:^|\s)value\s*=/i.test(m[1]);
    return {
      value: hasValue ? decode(attr(m[1], 'value')) : label,
      label,
      selected: /(?:^|\s)selected\b/i.test(m[1]),
    };
  });
}

/**
 * Escolhe a opção de uma lista obrigatória: a já marcada; senão a que corresponde ao requisito
 * (pelo id ou pelo título); senão a única opção real. Devolve null se não houver como decidir.
 * target: { id, title } do requisito que está sendo pausado.
 */
export function chooseOption(options, target) {
  const marked = options.find((o) => o.selected);
  if (marked) return marked;
  const real = options.filter((o) => o.value !== '');
  if (target?.id) {
    const byId = real.find((o) => o.value === String(target.id));
    if (byId) return byId;
  }
  if (target?.title) {
    const wanted = normalize(target.title);
    const byTitle = real.filter((o) => {
      const label = normalize(o.label);
      // O rótulo precisa conter o título inteiro; o inverso só vale para rótulos longos, para um
      // rótulo curto ("A") não casar por acaso com qualquer título.
      return label && (label.includes(wanted) || (label.length >= 8 && wanted.includes(label)));
    });
    if (byTitle.length === 1) return byTitle[0];
  }
  return real.length === 1 ? real[0] : null;
}

/**
 * Lê o formulário da janela de confirmação (js-modal-confirm) e monta o envio,
 * preenchendo o campo de observação com `comment` e as listas/opções obrigatórias
 * (select e grupos de rádio sem seleção) conforme o requisito `target` ({ id, title }).
 * Retorna { action, params, commentField, fields, unfilled } ou null se não houver formulário.
 * `unfilled` lista os campos que não deu para preencher com segurança (não enviar nesse caso).
 */
export function parseConfirmForm(html, comment, target) {
  const form = /<form\b([^>]*)>([\s\S]*?)<\/form>/i.exec(html);
  if (!form) return null;
  const action = decode(attr(form[1], 'action'));
  const params = new URLSearchParams();
  const fields = [];
  const unfilled = [];
  const radios = new Map();
  let commentField = '';

  for (const m of form[2].matchAll(/<input\b[^>]*>/gi)) {
    const name = attr(m[0], 'name');
    const type = (attr(m[0], 'type') || 'text').toLowerCase();
    if (!name || ['submit', 'button', 'reset', 'file'].includes(type)) continue;
    if (type === 'radio') {
      const group = radios.get(name) ?? [];
      group.push({
        value: decode(attr(m[0], 'value')),
        label: decode(attr(m[0], 'value')),
        selected: /\bchecked\b/i.test(m[0]),
      });
      radios.set(name, group);
      continue;
    }
    fields.push(`${name}(${type})`);
    if (type === 'checkbox' && !/\bchecked\b/i.test(m[0])) continue;
    params.set(name, decode(attr(m[0], 'value')));
    if (type === 'text' && !commentField && /coment|observ|motivo|note|descr/i.test(name))
      commentField = name;
  }

  const groups = [...radios].map(([name, options]) => ({ name, kind: 'radio', options }));
  for (const m of form[2].matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)) {
    const name = attr(m[1], 'name');
    if (name) groups.push({ name, kind: 'select', options: parseOptions(m[2]) });
  }
  for (const { name, kind, options } of groups) {
    fields.push(`${name}(${kind})`);
    const chosen = chooseOption(options, target);
    if (chosen) params.set(name, chosen.value);
    else unfilled.push({ name, options: options.map((o) => o.label || o.value) });
  }

  const textarea = /<textarea\b([^>]*)>/i.exec(form[2]);
  if (textarea) commentField = attr(textarea[1], 'name') || commentField;
  if (textarea) fields.push(`${commentField}(textarea)`);
  if (commentField) params.set(commentField, comment);

  return { action, params, commentField, fields, unfilled };
}
