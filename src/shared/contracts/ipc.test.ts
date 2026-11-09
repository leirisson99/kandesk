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
    });
    expect(ok.success).toBe(true);
  });

  it('abre card só com referência sprint/card', () => {
    const { input } = ipcChannels['kanban:open-card'];
    expect(input.safeParse({ id: '10526/254132' }).success).toBe(true);
    expect(input.safeParse({ id: 'https://evil.test' }).success).toBe(false);
    expect(input.safeParse({ id: '1/2/../3' }).success).toBe(false);
  });

  it('aceita tasks:list sem argumento ou com refresh', () => {
    const { input } = ipcChannels['tasks:list'];
    expect(input.safeParse(undefined).success).toBe(true);
    expect(input.safeParse({ refresh: true }).success).toBe(true);
    expect(input.safeParse({ refresh: 'sim' }).success).toBe(false);
  });
});
