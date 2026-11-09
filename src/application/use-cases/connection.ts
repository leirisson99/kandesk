import { KANBAN_BASE_URL } from '@shared/constants/kanban';
import { connectionInputSchema, type ConnectionStatus } from '@shared/schemas/connection';
import { DomainError, ValidationError } from '../errors';
import type { CredentialStore, KanbanAuthClient, StoredConnection } from '../ports';

interface Deps {
  credentials: CredentialStore;
  kanbanAuth: KanbanAuthClient;
}

function toStatus(
  secureStorageAvailable: boolean,
  connection: StoredConnection | null,
): ConnectionStatus {
  return {
    secureStorageAvailable,
    configured: connection !== null,
    username: connection?.username ?? null,
    displayName: connection?.displayName ?? null,
    baseUrl: KANBAN_BASE_URL,
  };
}

/** Casos de uso da conexão com o Kanban. O token nunca aparece nos resultados. */
export function createConnectionUseCases({ credentials, kanbanAuth }: Deps) {
  return {
    async getStatus(): Promise<ConnectionStatus> {
      return toStatus(await credentials.isAvailable(), await credentials.load());
    },

    /** Valida no Kanban e só então guarda; uma credencial recusada nunca é salva. */
    async connect(input: unknown): Promise<ConnectionStatus> {
      const parsed = connectionInputSchema.safeParse(input);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map((i) => i.message).join(' '));
      }
      if (!(await credentials.isAvailable())) {
        throw new DomainError(
          'O armazenamento seguro do sistema não está disponível; o token não será salvo em texto puro.',
        );
      }
      const user = await kanbanAuth.verify(parsed.data);
      const connection: StoredConnection = { ...parsed.data, displayName: user.name };
      await credentials.save(connection);
      return toStatus(true, connection);
    },

    /** Reconfere a credencial já guardada. */
    async test(): Promise<ConnectionStatus> {
      const stored = await credentials.load();
      if (!stored) throw new DomainError('Nenhuma conexão configurada.');
      const user = await kanbanAuth.verify(stored);
      return toStatus(await credentials.isAvailable(), { ...stored, displayName: user.name });
    },

    async disconnect(): Promise<ConnectionStatus> {
      await credentials.clear();
      return toStatus(await credentials.isAvailable(), null);
    },
  };
}
