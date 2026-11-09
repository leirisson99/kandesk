import { KANBAN_BASE_URL } from '../constants/kanban';

/** Referência de card no formato `<sprint>/<card>`, como em `Task.id`. */
export const CARD_REF_PATTERN = /^(\d+)\/(\d+)$/;

/**
 * Endereço do card no Kanboard (rota observada em docs/KANBAN_INVESTIGATION.md §6).
 * Só monta a partir do endereço fixo e de ids numéricos; devolve null para referência inválida.
 */
export function cardUrl(ref: string): string | null {
  const match = CARD_REF_PATTERN.exec(ref);
  if (!match) return null;
  return `${KANBAN_BASE_URL}/sprint/${match[1]}/solicitacao/${match[2]}`;
}
