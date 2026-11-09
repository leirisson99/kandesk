/**
 * Recursos que dependem de integração ainda não concluída. Ligue `pauseAndResume` quando a
 * pausa/retomada reais forem implementadas e validadas (docs/KANBAN_INVESTIGATION.md).
 */
export const FEATURES = {
  pauseAndResume: false,
} as const;

/** Aviso da versão de avaliação, exibido quando a pausa real ainda não existe. */
export const EVALUATION_NOTICE =
  'Versão de avaliação: a pausa e a retomada reais ainda estão em desenvolvimento. ' +
  'Por enquanto não é possível criar, editar nem ativar automações; conexão e lista de cards funcionam.';
