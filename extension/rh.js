// Leitura do RH Net (página /funcionario/main.php) e cálculo do expediente dinâmico.
// Funções puras, sem chrome.* nem fetch.

export const RH_BASE = 'https://www.rhnetsocial.com.br';
export const RH_PATH = '/funcionario/main.php';

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** True se o HTML é o painel do funcionário logado (e não a tela de login). */
export const isRhPanel = (html) => /class="elementosRegistroDia"/.test(html);

/**
 * Extrai do painel: batidas, intervalos do quadro de horário e previsão de saída.
 * Retorna { punches: [{ time: "08:25", type: "entrada"|"saida" }], intervals: [{ start, end }], forecastExit }.
 */
export function parseRhNet(html) {
  const punches = [];
  const rowRe =
    /<td class="horario">(\d{2}:\d{2})(?::\d{2})?<\/td>[\s\S]*?<td class="tipo icon-(entrada|saida)"/g;
  for (let m; (m = rowRe.exec(html));) punches.push({ time: m[1], type: m[2] });

  // "(08:45) Sexta: 09:00 - 12:45 / 14:00 - 19:00"
  const quadro =
    /class\s*=\s*"tabelaRegistro"\s*>\s*Quadro de hor[^<]*<\/span>\s*<p[^>]*>([^<]*)<\/p>/i.exec(
      html,
    )?.[1] ?? '';
  const intervals = [...quadro.matchAll(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/g)].map((m) => ({
    start: m[1],
    end: m[2],
  }));

  const forecastExit =
    /Previs[^<]*sa[^<]*:\s*<\/span>\s*<span[^>]*class="blocoHora"[^>]*>\s*(\d{2}:\d{2})/i.exec(
      html,
    )?.[1] ?? null;

  return { punches, intervals, forecastExit, quadro: quadro.trim() };
}

/**
 * Estado de expediente a partir do RH Net.
 * cfg: { rhEarlyMinutes, rhLunchGraceMinutes }
 * Retorna { working: boolean, reason: string }.
 */
export function rhWorkState(now, rh, cfg) {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const { punches, intervals, forecastExit } = rh;
  const last = punches.at(-1);

  if (!last) {
    if (!intervals.length)
      return { working: false, reason: 'sem batidas e sem quadro de horário hoje' };
    const start = toMin(intervals[0].start) - cfg.rhEarlyMinutes;
    const end = toMin(intervals.at(-1).end);
    return {
      working: nowMin >= start && nowMin < end,
      reason: 'ainda sem batida; usando o quadro de horário',
    };
  }

  if (last.type === 'saida')
    return { working: false, reason: `última batida é saída (${last.time})` };

  // Última batida é entrada: em qual bloco do dia estou?
  const block = punches.filter((p) => p.type === 'saida').length;
  const isLastBlock = intervals.length === 0 || block >= intervals.length - 1;

  if (isLastBlock && forecastExit) {
    const end = toMin(forecastExit);
    return nowMin < end
      ? { working: true, reason: `entrada às ${last.time}; previsão de saída ${forecastExit}` }
      : { working: false, reason: `passou da previsão de saída (${forecastExit})` };
  }
  if (!isLastBlock) {
    const end = toMin(intervals[block].end) + cfg.rhLunchGraceMinutes;
    return nowMin < end
      ? {
          working: true,
          reason: `entrada às ${last.time}; intervalo previsto ${intervals[block].end}`,
        }
      : {
          working: false,
          reason: `passou do fim previsto do turno (${intervals[block].end}) sem bater saída`,
        };
  }
  return { working: true, reason: `entrada às ${last.time}` };
}
