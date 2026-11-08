import { z } from 'zod';
import type { AppInfo } from './app';
import { appInfoSchema } from './app';
import {
  automationInputSchema,
  automationSchema,
  executionRecordSchema,
  taskSchema,
  type AutomationInput,
} from '../schemas/automation';
import { NOTIFICATION_TONES, type NotificationTone } from '../constants/notification-tones';
import { schedulerStatusSchema, windowStateSchema } from '../schemas/system';
import { preferencesSchema, type Preferences } from '../schemas/preferences';
import type { Automation, ExecutionRecord, Task } from '../types/automation';
import type { AppPlatform, SchedulerStatus, WindowState } from '../types/system';

const idInput = z.object({ id: z.string().min(1) });

/**
 * Registro único de canais IPC. Cada canal declara o schema da entrada e da saída;
 * Main valida a entrada, o preload expõe apenas métodos nomeados.
 */
export const ipcChannels = {
  'app:get-info': { input: z.undefined(), output: appInfoSchema },
  'app:quit': { input: z.undefined(), output: z.void() },
  'notifications:test': { input: z.undefined(), output: z.void() },
  'notifications:preview-tone': {
    input: z.object({ tone: z.enum(NOTIFICATION_TONES) }),
    output: z.void(),
  },
  'window:minimize': { input: z.undefined(), output: z.void() },
  'window:toggle-maximize': { input: z.undefined(), output: z.void() },
  'window:close': { input: z.undefined(), output: z.void() },
  'window:get-state': { input: z.undefined(), output: windowStateSchema },
  'scheduler:get-status': { input: z.undefined(), output: schedulerStatusSchema },
  'tasks:list': { input: z.undefined(), output: z.array(taskSchema) },
  'automations:list': { input: z.undefined(), output: z.array(automationSchema) },
  'automations:create': { input: automationInputSchema, output: automationSchema },
  'automations:update': {
    input: z.object({ id: z.string().min(1), input: automationInputSchema }),
    output: automationSchema,
  },
  'automations:delete': { input: idInput, output: z.void() },
  'automations:set-enabled': {
    input: z.object({ id: z.string().min(1), enabled: z.boolean() }),
    output: automationSchema,
  },
  'executions:list': { input: z.undefined(), output: z.array(executionRecordSchema) },
  'preferences:get': { input: z.undefined(), output: preferencesSchema },
  'preferences:update': { input: preferencesSchema.partial(), output: preferencesSchema },
} as const;

export type IpcChannel = keyof typeof ipcChannels;
export type IpcInput<C extends IpcChannel> = z.infer<(typeof ipcChannels)[C]['input']>;
export type IpcOutput<C extends IpcChannel> = z.infer<(typeof ipcChannels)[C]['output']>;

/** API exposta ao renderer via contextBridge (`window.api`). */
export interface RendererApi {
  /** Plataforma do sistema, disponível de forma síncrona (a barra de título depende dela). */
  readonly platform: AppPlatform;
  getAppInfo(): Promise<AppInfo>;
  /** Encerra o app de fato (ignora "manter na bandeja") e cancela os agendamentos. */
  quitApp(): Promise<void>;
  /** Mostra uma notificação de exemplo (com o som atual). */
  sendTestNotification(): Promise<void>;
  /** Toca um toque para o usuário ouvir antes de escolher. */
  previewNotificationTone(tone: NotificationTone): Promise<void>;
  minimizeWindow(): Promise<void>;
  toggleMaximizeWindow(): Promise<void>;
  /** Fecha a janela; com "manter na bandeja" ativo ela apenas é escondida. */
  closeWindow(): Promise<void>;
  getWindowState(): Promise<WindowState>;
  onWindowStateChanged(listener: (state: WindowState) => void): () => void;
  getSchedulerStatus(): Promise<SchedulerStatus>;
  onSchedulerStatusChanged(listener: () => void): () => void;
  listTasks(): Promise<Task[]>;
  listAutomations(): Promise<Automation[]>;
  createAutomation(input: AutomationInput): Promise<Automation>;
  updateAutomation(id: string, input: AutomationInput): Promise<Automation>;
  deleteAutomation(id: string): Promise<void>;
  setAutomationEnabled(id: string, enabled: boolean): Promise<Automation>;
  listExecutions(): Promise<ExecutionRecord[]>;
  /** Registra um ouvinte; devolve a função que o remove. */
  onExecutionsChanged(listener: () => void): () => void;
  getPreferences(): Promise<Preferences>;
  updatePreferences(patch: Partial<Preferences>): Promise<Preferences>;
}
