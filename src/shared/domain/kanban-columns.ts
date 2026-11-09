export type ColumnKind = 'working' | 'paused';

/** Maiúsculo e sem acento: os nomes das colunas variam de grafia entre sprints. */
function normalize(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
}

// Os ids das colunas mudam a cada sprint; a classificação é pelo NOME.
// Padrões observados na extensão de referência (docs/KANBAN_INVESTIGATION.md §7.2).
const PAUSED_PATTERN = /PAUSAD|PARAD/;
const WORKING_PATTERN = /^EM /;

const ARCHIVE_PATTERN =
  /^(JANEIRO|FEVEREIRO|MARCO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO)$/;

/** Coluna de arquivo mensal (JUNHO, OUTUBRO…): cards já entregues, fora do dia a dia. */
export function isArchiveColumn(name: string): boolean {
  return ARCHIVE_PATTERN.test(normalize(name));
}

/**
 * "paused" (PAUSADO, DESENVOLVIMENTO PARADO…), "working" (EM DESENVOLVIMENTO, EM CODE REVIEW…)
 * ou null quando a coluna não é acompanhada. "paused" tem precedência, como na extensão.
 */
export function classifyColumn(name: string): ColumnKind | null {
  const normalized = normalize(name);
  if (PAUSED_PATTERN.test(normalized)) return 'paused';
  if (WORKING_PATTERN.test(normalized)) return 'working';
  return null;
}
