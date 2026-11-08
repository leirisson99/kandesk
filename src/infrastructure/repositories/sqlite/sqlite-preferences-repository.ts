import type { DatabaseSync } from 'node:sqlite';
import type { PreferencesRepository } from '@application/ports';
import {
  DEFAULT_NOTIFICATION_TONE,
  isNotificationTone,
} from '@shared/constants/notification-tones';
import {
  DEFAULT_PREFERENCES,
  preferencesSchema,
  type Preferences,
} from '@shared/schemas/preferences';

export class SqlitePreferencesRepository implements PreferencesRepository {
  constructor(private readonly db: DatabaseSync) {}

  async get(): Promise<Preferences> {
    const row = this.db.prepare('SELECT data FROM preferences WHERE id = 1').get();
    if (!row) return DEFAULT_PREFERENCES;
    // Mescla com os padrões para tolerar preferências novas em bancos antigos.
    const stored = { ...DEFAULT_PREFERENCES, ...JSON.parse(row.data as string) };
    // Um toque removido/renomeado numa versão futura não pode quebrar as Configurações.
    if (!isNotificationTone(stored.notificationTone)) {
      stored.notificationTone = DEFAULT_NOTIFICATION_TONE;
    }
    return preferencesSchema.parse(stored);
  }

  async save(preferences: Preferences): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO preferences (id, data) VALUES (1, ?)
         ON CONFLICT(id) DO UPDATE SET data = excluded.data`,
      )
      .run(JSON.stringify(preferences));
  }
}
