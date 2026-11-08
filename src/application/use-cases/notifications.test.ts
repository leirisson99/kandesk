import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '@shared/schemas/preferences';
import type { AppNotification } from '../ports';
import { createNotificationUseCases } from './notifications';

function setup(notificationSound: boolean, notificationTone: 'chime' | 'drop' = 'chime') {
  const shown: AppNotification[] = [];
  const useCases = createNotificationUseCases({
    notifier: { show: (n) => void shown.push(n) },
    preferences: {
      get: async () => ({ ...DEFAULT_PREFERENCES, notificationSound, notificationTone }),
      save: async () => {},
    },
  });
  return { shown, useCases };
}

describe('notificação de teste', () => {
  it('toca o chime quando o som está ligado', async () => {
    const { shown, useCases } = setup(true);
    await useCases.sendTest();
    expect(shown).toHaveLength(1);
    expect(shown[0]).toMatchObject({ title: 'Notificação de teste', sound: 'chime' });
  });

  it('usa o toque escolhido', async () => {
    const { shown, useCases } = setup(true, 'drop');
    await useCases.sendTest();
    expect(shown[0]?.sound).toBe('drop');
  });

  it('fica silenciosa quando o som está desligado', async () => {
    const { shown, useCases } = setup(false);
    await useCases.sendTest();
    expect(shown[0]?.sound).toBeNull();
  });
});
