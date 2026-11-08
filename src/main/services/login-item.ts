import { app } from 'electron';

export const HIDDEN_ARG = '--hidden';

/** Iniciado pelo login do sistema (deve abrir minimizado na bandeja)? */
export function wasStartedHidden(): boolean {
  return process.argv.includes(HIDDEN_ARG) || app.getLoginItemSettings().wasOpenedAtLogin;
}

/** Linux não tem API equivalente no Electron; fica como limitação documentada. */
export function isLoginItemSupported(): boolean {
  return process.platform === 'win32' || process.platform === 'darwin';
}

/** Registra/remove a inicialização com o sistema. Em desenvolvimento nunca altera o sistema. */
export function applyLoginItem(enabled: boolean): void {
  if (!app.isPackaged || !isLoginItemSupported()) return;
  app.setLoginItemSettings({ openAtLogin: enabled, args: [HIDDEN_ARG] });
}
