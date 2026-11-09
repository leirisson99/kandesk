import { useCallback, useState } from 'react';
import type { ConnectionInput, ConnectionStatus } from '@shared/schemas/connection';
import { errorMessage } from '@/lib/errors';
import { publishConnectionStatus, useConnectionStatus } from './useConnectionStatus';

type Action = 'connect' | 'test' | 'disconnect';

/** Estado da conexão com o Kanban. O token só sai daqui rumo ao Main; nunca é guardado. */
export function useConnection() {
  const status = useConnectionStatus();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Action | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = useCallback(
    async (action: Action, task: () => Promise<ConnectionStatus>, success: string) => {
      setBusy(action);
      setError(null);
      setNotice(null);
      try {
        publishConnectionStatus(await task());
        setNotice(success);
        return true;
      } catch (e) {
        setError(errorMessage(e));
        return false;
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  return {
    status,
    error,
    notice,
    busy,
    connect: (input: ConnectionInput) =>
      run(
        'connect',
        () => window.api.connectKanban(input),
        'Conexão validada e salva com segurança.',
      ),
    test: () => run('test', () => window.api.testKanbanConnection(), 'Conexão funcionando.'),
    disconnect: () =>
      run(
        'disconnect',
        () => window.api.disconnectKanban(),
        'Credencial removida deste computador.',
      ),
  };
}
