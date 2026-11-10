import { z } from 'zod';
import { CARD_REF_PATTERN } from '../domain/kanban-links';

/**
 * Protocolo entre o app e a extensão do navegador (versão 1).
 * A extensão (JavaScript puro em extension/) repete este contrato à mão: se mudar aqui, mude lá
 * e suba BRIDGE_PROTOCOL_VERSION.
 */
export const BRIDGE_PROTOCOL_VERSION = 1;

/** Porta padrão do servidor local (somente 127.0.0.1). */
export const BRIDGE_DEFAULT_PORT = 47615;

/** Comando enviado do app para a extensão. */
export const bridgeCommandSchema = z.object({
  id: z.string().min(1).max(64),
  /** Na v1 só PAUSE é enviado; a retomada é manual (o app apenas avisa). */
  action: z.literal('PAUSE'),
  ref: z.string().regex(CARD_REF_PATTERN),
});
export type BridgeCommand = z.infer<typeof bridgeCommandSchema>;

/** Resposta da extensão depois de tentar executar o comando. */
export const bridgeResultSchema = z.object({
  commandId: z.string().min(1).max(64),
  /** APPLIED: pausou. ALREADY_IN_STATE: nada estava rodando. FAILED: não foi possível. */
  outcome: z.enum(['APPLIED', 'ALREADY_IN_STATE', 'FAILED']),
  message: z.string().max(500),
});
export type BridgeResult = z.infer<typeof bridgeResultSchema>;
