import { describe, expect, it } from 'vitest';
import { isSearchShortcut, searchShortcutLabel } from './platform';

const key = (over: Partial<Parameters<typeof isSearchShortcut>[0]>) => ({
  key: 'k',
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...over,
});

describe('atalho de busca', () => {
  it('rótulo por plataforma', () => {
    expect(searchShortcutLabel('darwin')).toBe('⌘K');
    expect(searchShortcutLabel('win32')).toBe('Ctrl K');
    expect(searchShortcutLabel('linux')).toBe('Ctrl K');
  });

  it('usa ⌘ no macOS e Ctrl nos demais', () => {
    expect(isSearchShortcut(key({ metaKey: true }), 'darwin')).toBe(true);
    expect(isSearchShortcut(key({ ctrlKey: true }), 'darwin')).toBe(false);
    expect(isSearchShortcut(key({ ctrlKey: true, key: 'K' }), 'linux')).toBe(true);
    expect(isSearchShortcut(key({ metaKey: true }), 'win32')).toBe(false);
  });

  it('ignora outras teclas e combinações com Alt/Shift', () => {
    expect(isSearchShortcut(key({ ctrlKey: true, key: 'j' }), 'linux')).toBe(false);
    expect(isSearchShortcut(key({ ctrlKey: true, shiftKey: true }), 'linux')).toBe(false);
    expect(isSearchShortcut(key({ ctrlKey: true, altKey: true }), 'linux')).toBe(false);
  });
});
