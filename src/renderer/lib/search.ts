import type { Automation } from '@shared/types/automation';

/** Minúsculas e sem acentos, para "almoco" encontrar "Almoço". */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** Automações cujo nome ou tarefa contém o texto; vazio devolve lista vazia. */
export function searchAutomations(
  automations: readonly Automation[],
  query: string,
  limit = 6,
): Automation[] {
  const needle = normalizeText(query);
  if (!needle) return [];
  return automations
    .filter((a) => normalizeText(`${a.name} ${a.taskId}`).includes(needle))
    .slice(0, limit);
}
