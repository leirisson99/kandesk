import { app, ipcMain } from 'electron';
import { ValidationError } from '@application/errors';
import type { UseCases } from '@application/use-cases';
import type { NotificationTone } from '@shared/constants/notification-tones';
import type { Preferences } from '@shared/schemas/preferences';
import type { SchedulerStatus, WindowState } from '@shared/types/system';
import { cardUrl } from '@shared/domain/kanban-links';
import { ipcChannels, type IpcChannel, type IpcInput, type IpcOutput } from '@shared/contracts/ipc';

type Handler<C extends IpcChannel> = (input: IpcInput<C>) => Promise<IpcOutput<C>> | IpcOutput<C>;

/** Registra um handler validando entrada e saída com os schemas do contrato. */
function handle<C extends IpcChannel>(channel: C, handler: Handler<C>): void {
  ipcMain.handle(channel, async (_event, raw: unknown) => {
    const parsed = ipcChannels[channel].input.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join(' '));
    }
    const input = parsed.data as IpcInput<C>;
    const result = await handler(input);
    return ipcChannels[channel].output.parse(result);
  });
}

export interface IpcHooks {
  window: {
    minimize: () => void;
    toggleMaximize: () => void;
    close: () => void;
    getState: () => WindowState;
  };
  getSchedulerStatus: () => SchedulerStatus;
  onPreferencesChanged: (preferences: Preferences) => void;
  quit: () => void;
  /** Abre um endereço no navegador padrão. Só recebe endereços montados pelo Main. */
  openExternal: (url: string) => Promise<void>;
  sendTestNotification: () => Promise<void>;
  previewTone: (tone: NotificationTone) => Promise<void>;
}

export function registerIpcHandlers(useCases: UseCases, hooks: IpcHooks): void {
  handle('app:get-info', () => {
    const platform = process.platform;
    if (platform !== 'win32' && platform !== 'darwin' && platform !== 'linux') {
      throw new Error(`Plataforma não suportada: ${platform}`);
    }
    return {
      name: app.getName(),
      version: app.getVersion(),
      platform,
    };
  });

  handle('app:quit', () => hooks.quit());
  handle('notifications:test', () => hooks.sendTestNotification());
  handle('notifications:preview-tone', ({ tone }) => hooks.previewTone(tone));
  handle('window:minimize', () => hooks.window.minimize());
  handle('window:toggle-maximize', () => hooks.window.toggleMaximize());
  handle('window:close', () => hooks.window.close());
  handle('window:get-state', () => hooks.window.getState());
  handle('scheduler:get-status', () => hooks.getSchedulerStatus());
  handle('tasks:list', (options) => useCases.listTasks(options));
  handle('kanban:open-card', async ({ id }) => {
    const url = cardUrl(id);
    if (!url) throw new ValidationError('Referência de card inválida.');
    await hooks.openExternal(url);
  });
  handle('automations:list', () => useCases.automations.list());
  handle('automations:create', (input) => useCases.automations.create(input));
  handle('automations:update', ({ id, input }) => useCases.automations.update(id, input));
  handle('automations:delete', ({ id }) => useCases.automations.remove(id));
  handle('automations:set-enabled', ({ id, enabled }) =>
    useCases.automations.setEnabled(id, enabled),
  );
  handle('executions:list', () => useCases.listExecutions());
  handle('preferences:get', () => useCases.getPreferences());
  handle('preferences:update', async (patch) => {
    const updated = await useCases.updatePreferences(patch);
    hooks.onPreferencesChanged(updated);
    return updated;
  });
  handle('kanban:get-status', () => useCases.connection.getStatus());
  handle('kanban:connect', (input) => useCases.connection.connect(input));
  handle('kanban:test-connection', () => useCases.connection.test());
  handle('kanban:disconnect', () => useCases.connection.disconnect());
}
