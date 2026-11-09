/**
 * Converte segundos Unix (número ou texto, como o Kanboard devolve em `date_moved`) para ISO.
 * Devolve null para ausente, 0 ou valor inválido, em vez de inventar uma data.
 */
export function unixSecondsToIso(value: unknown): string | null {
  if (value == null || value === '') return null;
  const seconds = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
