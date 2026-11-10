// Cache em chrome.storage.local para reduzir requisições ao Kanboard.

const KEY = "cache";

export const TTL = {
  me: 24 * 3_600_000, // usuário logado (id e nome)
  sprints: 6 * 3_600_000, // lista de "Minhas sprints"
  board: 3 * 60_000, // lista de cards/colunas de cada sprint
  tracking: 5 * 60_000, // rastreamento de cards que não têm cronômetro meu
  spent: 30 * 60_000, // se já lancei tempo no card (histórico muda pouco)
  rh: 2 * 60_000, // painel do RH Net (batidas)
  offHoursIdle: 15 * 60_000, // fora do expediente sem cronômetro meu: reescaneia raramente
};

const empty = () => ({
  me: null, // { at, id, name, username }
  sprints: null, // { at, ids: [...] }
  boards: {}, // { [sprintId]: { at, cards: [cards de colunas monitoradas] } }
  tracking: {}, // { [taskId]: { at, entries } } (entradas sintéticas de cronômetro)
  spent: {}, // { [taskId]: { at, mine } }
  rh: null, // { at, day, data }
  myOpen: [], // taskIds com cronômetro meu aberto no último scan
  lastScan: 0,
});

export async function loadCache() {
  const { cache } = await chrome.storage.local.get(KEY);
  return { ...empty(), ...(cache ?? {}) };
}

export const saveCache = (cache) => chrome.storage.local.set({ [KEY]: cache });

export const clearCache = () => chrome.storage.local.remove(KEY);

export const isFresh = (at, ttl) => Boolean(at) && Date.now() - at < ttl;
