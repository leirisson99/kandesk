export const BASE = "https://kanboard.sci.com.br";

export const DEFAULTS = {
  // Sprints a monitorar (ids separados por vírgula). Vazio = todas as de "Minhas sprints".
  sprintIds: "",
  // Nome como aparece em "Rastreamento de tempo". Vazio = detecta pelo usuário logado.
  myName: "",
  checkEveryMinutes: 1,
  renotifyEveryMinutes: 60,
  autoPause: true,
  // Expediente dinâmico pelas batidas do RH Net; se indisponível, usa os horários manuais abaixo.
  useRhNet: true,
  rhEarlyMinutes: 15, // antes da 1ª batida, considera expediente a partir de (início do quadro - N min)
  rhLunchGraceMinutes: 10, // tolerância após o fim previsto do turno sem bater saída
  days: [1, 2, 3, 4, 5],
  // Intervalos de expediente (HH:MM). Fora deles = intervalo/fim de expediente.
  workIntervals: [
    { start: "08:00", end: "12:45" },
    { start: "14:00", end: "18:00" },
  ],
  // Colunas classificadas pelo NOME (regex, sem acento, maiúsculo), pois os ids mudam por sprint.
  // working: o card deve ter cronômetro seu rodando (EM DESENVOLVIMENTO, EM CODE REVIEW, EM TESTES, ...).
  workingColumnPattern: "^EM ",
  // paused: nenhum cronômetro seu pode estar rodando (PAUSADO, DESENVOLVIMENTO PARADO, TESTE PARADO).
  pausedColumnPattern: "PAUSAD|PARAD",
};

const isTime = (v) => typeof v === "string" && /^\d{2}:\d{2}$/.test(v);

/** Mescla o salvo com os padrões, ignorando valores inválidos (null, vazio, etc.). */
export function normalizeSettings(saved) {
  const s = saved ?? {};
  const intervals =
    Array.isArray(s.workIntervals) &&
    s.workIntervals.length === 2 &&
    s.workIntervals.every((i) => isTime(i?.start) && isTime(i?.end))
      ? s.workIntervals
      : DEFAULTS.workIntervals;
  return {
    ...DEFAULTS,
    ...s,
    workIntervals: intervals,
    days: Array.isArray(s.days) && s.days.length ? s.days : DEFAULTS.days,
    renotifyEveryMinutes: Number(s.renotifyEveryMinutes) > 0 ? Number(s.renotifyEveryMinutes) : DEFAULTS.renotifyEveryMinutes,
    checkEveryMinutes: Number(s.checkEveryMinutes) > 0 ? Number(s.checkEveryMinutes) : DEFAULTS.checkEveryMinutes,
    autoPause: typeof s.autoPause === "boolean" ? s.autoPause : DEFAULTS.autoPause,
    useRhNet: typeof s.useRhNet === "boolean" ? s.useRhNet : DEFAULTS.useRhNet,
    myName: typeof s.myName === "string" ? s.myName : DEFAULTS.myName,
    sprintIds: typeof s.sprintIds === "string" ? s.sprintIds : DEFAULTS.sprintIds,
    workingColumnPattern: typeof s.workingColumnPattern === "string" && s.workingColumnPattern ? s.workingColumnPattern : DEFAULTS.workingColumnPattern,
    pausedColumnPattern: typeof s.pausedColumnPattern === "string" && s.pausedColumnPattern ? s.pausedColumnPattern : DEFAULTS.pausedColumnPattern,
  };
}
