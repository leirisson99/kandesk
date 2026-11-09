import { useEffect, useSyncExternalStore } from 'react';
import type { ConnectionStatus } from '@shared/schemas/connection';

// Estado único da conexão, compartilhado entre telas (barra lateral, painel, configurações).
let current: ConnectionStatus | null = null;
let loading = false;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function publishConnectionStatus(status: ConnectionStatus): void {
  current = status;
  listeners.forEach((listener) => listener());
}

/** Estado da conexão com o Kanban (null enquanto carrega). Nunca contém o token. */
export function useConnectionStatus(): ConnectionStatus | null {
  const status = useSyncExternalStore(subscribe, () => current);
  useEffect(() => {
    if (current || loading) return;
    loading = true;
    window.api
      .getConnectionStatus()
      .then(publishConnectionStatus)
      .catch((e: unknown) => console.error('Falha ao ler o estado da conexão:', e))
      .finally(() => {
        loading = false;
      });
  }, []);
  return status;
}
