import { z } from 'zod';
import { CommunicationError } from '@application/errors';
import type { KanbanAuthClient, KanbanCredentials, KanbanUser } from '@application/ports';
import type { KanbanJsonRpcClient } from './jsonrpc-client';

// `getMe` devolve segredos (api_access_token, twofactor_secret). Este schema mantém SOMENTE o
// necessário; o Zod descarta os demais campos, que nunca saem desta função.
const meSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  username: z.string(),
  name: z.string(),
});

export class KanbanAuthApiClient implements KanbanAuthClient {
  constructor(private readonly rpc: KanbanJsonRpcClient) {}

  async verify(credentials: KanbanCredentials): Promise<KanbanUser> {
    const raw = await this.rpc.call(credentials, 'getMe');
    const parsed = meSchema.safeParse(raw);
    if (!parsed.success) {
      throw new CommunicationError('O Kanboard devolveu dados de usuário em formato inesperado.');
    }
    return parsed.data;
  }
}
