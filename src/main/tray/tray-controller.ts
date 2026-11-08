import { Menu, Tray, nativeImage } from 'electron';

interface Actions {
  iconPath: string;
  onOpen: () => void;
  onQuit: () => void;
}

/**
 * Ícone na bandeja. `available` fica false se o sistema não conseguir criá-la; nesse caso o
 * app não deve esconder a janela ao fechar (o usuário não teria como reabri-la).
 */
export class TrayController {
  available = false;
  private tray: Tray | null = null;

  create({ iconPath, onOpen, onQuit }: Actions): void {
    try {
      const tray = new Tray(nativeImage.createFromPath(iconPath).resize({ width: 22, height: 22 }));
      tray.setToolTip('Kandesk — automações em execução');
      tray.setContextMenu(
        Menu.buildFromTemplate([
          { label: 'Abrir Kandesk', click: onOpen },
          { type: 'separator' },
          { label: 'Sair', click: onQuit },
        ]),
      );
      tray.on('click', onOpen);
      this.tray = tray;
      this.available = true;
    } catch (error) {
      this.available = false;
      console.error('Bandeja do sistema indisponível:', error);
    }
  }

  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
  }
}
