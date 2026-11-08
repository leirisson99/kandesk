/**
 * Extrai uma mensagem legível. Rejeições do ipcRenderer.invoke chegam como
 * "Error invoking remote method 'canal': NomeDoErro: mensagem"; o prefixo é ruído para o usuário.
 */
export function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(/^Error invoking remote method '[^']*': (?:\w+Error: )?/, '');
}
