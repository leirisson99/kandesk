import { pathToFileURL } from 'node:url';
import { BrowserWindow } from 'electron';
import type { NotificationTone } from '@shared/constants/notification-tones';

/**
 * Toca os sons do app em todas as plataformas com o mesmo comportamento (o som nativo das
 * notificações só existe de forma confiável no macOS). Usa uma janela oculta e sem acesso a Node,
 * criada sob demanda; assim o som toca mesmo com a janela principal escondida na bandeja.
 */
export class SoundPlayer {
  private host: Promise<BrowserWindow> | null = null;

  constructor(
    private readonly hostPagePath: string,
    private readonly files: Record<NotificationTone, string>,
  ) {}

  /** Nunca lança: falha de áudio não pode impedir a notificação nem derrubar o agendador. */
  async play(sound: NotificationTone): Promise<void> {
    try {
      const window = await this.getHost();
      const url = pathToFileURL(this.files[sound]).href;
      await window.webContents.executeJavaScript(
        `new Audio(${JSON.stringify(url)}).play().then(() => undefined)`,
      );
    } catch (error) {
      console.error('Falha ao tocar o som da notificação:', error);
    }
  }

  dispose(): void {
    void this.host?.then((w) => !w.isDestroyed() && w.destroy()).catch(() => undefined);
    this.host = null;
  }

  private getHost(): Promise<BrowserWindow> {
    this.host ??= this.createHost();
    return this.host;
  }

  private async createHost(): Promise<BrowserWindow> {
    const window = new BrowserWindow({
      show: false,
      skipTaskbar: true,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        autoplayPolicy: 'no-user-gesture-required',
        backgroundThrottling: false,
      },
    });
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.on('closed', () => {
      this.host = null;
    });
    try {
      await window.loadFile(this.hostPagePath);
    } catch (error) {
      window.destroy();
      this.host = null;
      throw error;
    }
    return window;
  }
}
