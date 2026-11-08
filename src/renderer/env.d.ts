/// <reference types="vite/client" />
import type { RendererApi } from '@shared/contracts/ipc';

declare global {
  interface Window {
    /** Exposto pelo preload via contextBridge. */
    api: RendererApi;
  }
}
