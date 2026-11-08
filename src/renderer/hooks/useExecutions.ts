import { useEffect } from 'react';
import { useResource } from './useResource';

const load = () => window.api.listExecutions();

/** Histórico de execuções, recarregado quando o agendador registra algo novo. */
export function useExecutions() {
  const resource = useResource(load);
  const { reload } = resource;

  useEffect(() => window.api.onExecutionsChanged(() => void reload()), [reload]);

  return resource;
}
