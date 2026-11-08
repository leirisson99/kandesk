import type { NotificationTone } from '@shared/constants/notification-tones';

/** Nomes exibidos para cada toque (a ordem da lista é a da interface). */
export const TONE_LABELS: Record<NotificationTone, string> = {
  chime: 'Cristal',
  alert: 'Alerta',
  drop: 'Gota',
  bell: 'Sino',
  pulse: 'Pulso',
};
