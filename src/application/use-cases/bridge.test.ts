import { describe, expect, it } from 'vitest';
import type { BridgeMonitor, PairingCodeStore } from '../ports';
import { createBridgeUseCases } from './bridge';

const monitor: BridgeMonitor = {
  getStatus: () => ({
    running: true,
    port: 47615,
    connected: false,
    lastSeenAt: null,
    error: null,
  }),
};

function pairingStore(fail = false): PairingCodeStore & { calls: string[] } {
  let code = 'codigo-1';
  const calls: string[] = [];
  return {
    calls,
    getOrCreate: async () => {
      calls.push('get');
      if (fail) throw new Error('Armazenamento seguro indisponível.');
      return code;
    },
    regenerate: async () => {
      calls.push('regenerate');
      if (fail) throw new Error('Armazenamento seguro indisponível.');
      code = 'codigo-2';
      return code;
    },
  };
}

describe('ponte com a extensão', () => {
  it('junta o estado do servidor com o código de pareamento', async () => {
    const { getStatus } = createBridgeUseCases({ pairing: pairingStore(), bridge: monitor });
    expect(await getStatus()).toEqual({
      running: true,
      port: 47615,
      connected: false,
      lastSeenAt: null,
      error: null,
      pairingCode: 'codigo-1',
    });
  });

  it('regenerar troca o código', async () => {
    const pairing = pairingStore();
    const useCases = createBridgeUseCases({ pairing, bridge: monitor });
    expect((await useCases.regenerateCode()).pairingCode).toBe('codigo-2');
    expect((await useCases.getStatus()).pairingCode).toBe('codigo-2');
  });

  it('sem armazenamento seguro, mostra o motivo e nenhum código', async () => {
    const { getStatus } = createBridgeUseCases({ pairing: pairingStore(true), bridge: monitor });
    expect(await getStatus()).toMatchObject({
      pairingCode: '',
      error: 'Armazenamento seguro indisponível.',
    });
  });
});
