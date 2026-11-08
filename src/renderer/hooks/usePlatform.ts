import type { AppPlatform } from '@shared/types/system';

/** Plataforma, síncrona (vem do preload). */
export function usePlatform(): AppPlatform {
  return window.api.platform;
}
