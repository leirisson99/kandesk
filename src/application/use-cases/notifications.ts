import type { Notifier, PreferencesRepository } from '../ports';

interface Deps {
  notifier: Notifier;
  preferences: PreferencesRepository;
}

export function createNotificationUseCases({ notifier, preferences }: Deps) {
  return {
    /** Notificação de exemplo, para o usuário conferir o aviso e o som atuais. */
    async sendTest(): Promise<void> {
      const prefs = await preferences.get();
      notifier.show({
        title: 'Notificação de teste',
        body: 'Se você viu este aviso, as notificações do Kandesk estão funcionando.',
        sound: prefs.notificationSound ? prefs.notificationTone : null,
      });
    },
  };
}
