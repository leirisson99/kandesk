import { useCallback, useEffect, useState } from 'react';
import type { BridgeStatus } from '@shared/schemas/bridge';
import { errorMessage } from '@/lib/errors';
import { useResource } from './useResource';

const load = () => window.api.getBridgeStatus();
const REFRESH_MS = 10_000;

/** Estado da ponte com a extensão, atualizado a cada 10 s; o código só muda ao regenerar. */
export function useBridgeStatus() {
  const { data, error, reload } = useResource(load);
  const [status, setStatus] = useState<BridgeStatus | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => void reload(), REFRESH_MS);
    return () => clearInterval(id);
  }, [reload]);

  const regenerate = useCallback(async () => {
    try {
      setActionError(null);
      setStatus(await window.api.regenerateBridgeCode());
    } catch (e) {
      setActionError(errorMessage(e));
    }
  }, []);

  // Depois de regenerar, vale o resultado da ação até a próxima leitura periódica.
  const current = status && (!data || status.pairingCode !== data.pairingCode) ? status : data;
  return { status: current, error: actionError ?? error, regenerate };
}
