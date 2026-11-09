import { z } from 'zod';

/** Credenciais digitadas pelo usuário. O token só trafega nesta direção (renderer → main). */
export const connectionInputSchema = z.object({
  username: z.string().trim().min(1, 'Informe o usuário.').max(100, 'Usuário muito longo.'),
  token: z.string().trim().min(1, 'Informe o token da API.').max(256, 'Token muito longo.'),
});

export type ConnectionInput = z.infer<typeof connectionInputSchema>;

/** Estado da conexão exibido na interface. Nunca contém o token. */
export const connectionStatusSchema = z.object({
  /** O sistema oferece armazenamento seguro (keychain/DPAPI/keyring) para guardar o token? */
  secureStorageAvailable: z.boolean(),
  configured: z.boolean(),
  username: z.string().nullable(),
  displayName: z.string().nullable(),
  baseUrl: z.string(),
});

export type ConnectionStatus = z.infer<typeof connectionStatusSchema>;
