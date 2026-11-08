import { z } from 'zod';
import { DEFAULT_NOTIFICATION_TONE, NOTIFICATION_TONES } from '../constants/notification-tones';

export const preferencesSchema = z.object({
  startWithSystem: z.boolean(),
  keepInTray: z.boolean(),
  /** Toca um som junto das notificações. */
  notificationSound: z.boolean(),
  /** Toque usado em todas as notificações. */
  notificationTone: z.enum(NOTIFICATION_TONES),
  notifySuccess: z.boolean(),
  notifyAuthFailure: z.boolean(),
  notifyCommFailure: z.boolean(),
  notifyMissed: z.boolean(),
});

export type Preferences = z.infer<typeof preferencesSchema>;

export const DEFAULT_PREFERENCES: Preferences = {
  startWithSystem: true,
  keepInTray: true,
  notificationSound: true,
  notificationTone: DEFAULT_NOTIFICATION_TONE,
  notifySuccess: false,
  notifyAuthFailure: true,
  notifyCommFailure: true,
  notifyMissed: true,
};
