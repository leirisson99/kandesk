import type { BridgeStatus } from '@shared/schemas/bridge';
import type { BridgeMonitor, PairingCodeStore } from '../ports';

interface Deps {
  pairing: PairingCodeStore;
  bridge: BridgeMonitor;
}

/** Estado e pareamento da ponte com a extensão do navegador. */
export function createBridgeUseCases({ pairing, bridge }: Deps) {
  async function status(regenerate: boolean): Promise<BridgeStatus> {
    const state = bridge.getStatus();
    try {
      const pairingCode = regenerate ? await pairing.regenerate() : await pairing.getOrCreate();
      return { ...state, pairingCode };
    } catch (error) {
      // Sem armazenamento seguro não há código; o motivo aparece na tela.
      return {
        ...state,
        pairingCode: '',
        error: error instanceof Error ? error.message : 'Não foi possível obter o código.',
      };
    }
  }

  return {
    getStatus: () => status(false),
    /** Gera um novo código; o anterior deixa de valer e a extensão precisa ser pareada de novo. */
    regenerateCode: () => status(true),
  };
}
