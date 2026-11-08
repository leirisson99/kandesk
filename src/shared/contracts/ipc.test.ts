import { describe, expect, it } from 'vitest';
import { ipcChannels } from './ipc';

describe('ipcChannels', () => {
  it('rejeita entrada inesperada em app:get-info', () => {
    expect(ipcChannels['app:get-info'].input.safeParse({ a: 1 }).success).toBe(false);
    expect(ipcChannels['app:get-info'].input.safeParse(undefined).success).toBe(true);
  });

  it('valida a saída de app:get-info', () => {
    const ok = ipcChannels['app:get-info'].output.safeParse({
      name: 'x',
      version: '1',
      platform: 'linux',
      integrationMode: 'MOCK',
    });
    expect(ok.success).toBe(true);
  });
});
