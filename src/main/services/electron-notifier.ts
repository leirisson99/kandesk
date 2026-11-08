import { Notification } from 'electron';
import type { AppNotification, Notifier } from '@application/ports';
import type { SoundPlayer } from './sound-player';

/** Notificações nativas do sistema. Conteúdo vem sempre da camada de aplicação (sem segredos). */
export class ElectronNotifier implements Notifier {
  constructor(
    private readonly sounds: SoundPlayer,
    private readonly onClick: () => void,
  ) {}

  show({ title, body, sound }: AppNotification): void {
    // O som é sempre do app (SoundPlayer): `silent` evita som duplo ou diferente por plataforma.
    if (Notification.isSupported()) {
      const notification = new Notification({ title, body, silent: true });
      notification.on('click', this.onClick);
      notification.show();
    }
    if (sound) void this.sounds.play(sound);
  }
}
