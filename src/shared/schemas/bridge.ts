import { z } from 'zod';

/** Estado da ponte com a extensão, exibido em Configurações. */
export const bridgeStatusSchema = z.object({
  /** O servidor local está escutando? */
  running: z.boolean(),
  port: z.number().int().nullable(),
  /** A extensão consultou o app recentemente? */
  connected: z.boolean(),
  lastSeenAt: z.iso.datetime({ offset: true }).nullable(),
  /** Motivo de o servidor não ter subido (ex.: porta ocupada). */
  error: z.string().nullable(),
  /**
   * Código que o usuário copia para a extensão. É um segredo local de pareamento, diferente do
   * token do Kanban, e existe para ser exibido ao usuário.
   */
  pairingCode: z.string(),
});

export type BridgeStatus = z.infer<typeof bridgeStatusSchema>;
