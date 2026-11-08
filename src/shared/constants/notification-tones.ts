// Sem dependências de runtime (usado pelo preload, pelo schema e pela interface).

/** Toques disponíveis para as notificações; cada id corresponde a resources/sounds/<id>.wav. */
export const NOTIFICATION_TONES = ['chime', 'alert', 'drop', 'bell', 'pulse'] as const;

export type NotificationTone = (typeof NOTIFICATION_TONES)[number];

export const DEFAULT_NOTIFICATION_TONE: NotificationTone = 'chime';

export function isNotificationTone(value: unknown): value is NotificationTone {
  return (NOTIFICATION_TONES as readonly unknown[]).includes(value);
}
