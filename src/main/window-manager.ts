import { join } from 'node:path';
import { BrowserWindow, shell, type BrowserWindowConstructorOptions } from 'electron';
import { WINDOW_STATE_CHANGED_EVENT } from '@shared/constants/events';
import type { WindowState } from '@shared/types/system';

/** Altura da barra de título desenhada pelo app (px); os semáforos do macOS se alinham a ela. */
export const TITLE_BAR_HEIGHT = 40;

/** A barra de título é do app nos três sistemas; muda só quem desenha os botões de janela. */
function frameOptions(): BrowserWindowConstructorOptions {
  if (process.platform === 'darwin') {
    return {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 14, y: (TITLE_BAR_HEIGHT - 12) / 2 },
    };
  }
  return { frame: false };
}

interface Options {
  /** Lido a cada fechamento; devolve false quando a bandeja não está disponível. */
  shouldKeepInTray: () => boolean;
  startHidden: boolean;
  /** Ícone da janela (barra de tarefas no Linux/Windows). */
  iconPath: string;
  /** A janela principal foi fechada de verdade (não apenas escondida). */
  onClosed: () => void;
}

/** Cria a janela principal e implementa "fechar mantém o app na bandeja". */
export class WindowManager {
  private window: BrowserWindow | null = null;
  private quitting = false;

  constructor(private readonly options: Options) {}

  markQuitting(): void {
    this.quitting = true;
  }

  isQuitting(): boolean {
    return this.quitting;
  }

  create(): void {
    const window = new BrowserWindow({
      width: 1100,
      height: 720,
      minWidth: 800,
      minHeight: 560,
      show: false,
      title: 'Kandesk',
      icon: this.options.iconPath,
      ...frameOptions(),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    this.window = window;

    window.once('ready-to-show', () => {
      if (!this.options.startHidden) window.show();
    });

    window.on('close', (event) => {
      if (!this.quitting && this.options.shouldKeepInTray()) {
        event.preventDefault();
        window.hide();
      }
    });
    const publishState = () => this.broadcast(WINDOW_STATE_CHANGED_EVENT, this.getState());
    window.on('maximize', publishState);
    window.on('unmaximize', publishState);
    window.on('enter-full-screen', publishState);
    window.on('leave-full-screen', publishState);
    window.on('closed', () => {
      this.window = null;
      this.options.onClosed();
    });

    // Links externos abrem no navegador do sistema; o renderer nunca navega para fora.
    window.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https://')) void shell.openExternal(url);
      return { action: 'deny' };
    });
    window.webContents.on('will-navigate', (event, url) => {
      if (url !== window.webContents.getURL()) event.preventDefault();
    });

    if (process.env['ELECTRON_RENDERER_URL']) {
      void window.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
      void window.loadFile(join(__dirname, '../renderer/index.html'));
    }
  }

  /** Mostra a janela (recriando-a se necessário). */
  show(): void {
    if (!this.window) {
      this.create();
      return;
    }
    if (this.window.isMinimized()) this.window.restore();
    this.window.show();
    this.window.focus();
  }

  minimize(): void {
    this.window?.minimize();
  }

  toggleMaximize(): void {
    if (!this.window) return;
    if (this.window.isMaximized()) this.window.unmaximize();
    else this.window.maximize();
  }

  /** Passa pelo handler de fechamento (respeita "manter na bandeja"). */
  close(): void {
    this.window?.close();
  }

  getState(): WindowState {
    return {
      maximized: this.window?.isMaximized() ?? false,
      fullScreen: this.window?.isFullScreen() ?? false,
    };
  }

  /** Envia um evento à janela principal (payload opcional, sempre gerado pelo main). */
  broadcast(channel: string, payload?: unknown): void {
    if (this.window && !this.window.isDestroyed()) this.window.webContents.send(channel, payload);
  }
}
