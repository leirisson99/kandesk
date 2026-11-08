import type { AppPlatform } from '@shared/types/system';

interface KeyEventLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

export function searchShortcutLabel(platform: AppPlatform): string {
  return platform === 'darwin' ? '⌘K' : 'Ctrl K';
}

/** ⌘K no macOS, Ctrl+K nos demais; ignora combinações com Alt/Shift. */
export function isSearchShortcut(event: KeyEventLike, platform: AppPlatform): boolean {
  if (event.altKey || event.shiftKey || event.key.toLowerCase() !== 'k') return false;
  return platform === 'darwin' ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
}
