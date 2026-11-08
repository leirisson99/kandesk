import { contextBridge, ipcRenderer } from 'electron';
import {
  EXECUTIONS_CHANGED_EVENT,
  SCHEDULER_STATUS_CHANGED_EVENT,
  WINDOW_STATE_CHANGED_EVENT,
} from '@shared/constants/events';
import type { RendererApi } from '@shared/contracts/ipc';
import type { AppPlatform, WindowState } from '@shared/types/system';

const platform: AppPlatform =
  process.platform === 'win32' || process.platform === 'darwin' ? process.platform : 'linux';

/** Inscreve um ouvinte sem repassar o evento do Electron ao renderer. */
function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
  const wrapped = (_event: unknown, payload: T) => listener(payload);
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
}

// Expõe apenas métodos nomeados; nunca ipcRenderer nem um canal genérico.
const api: RendererApi = {
  platform,
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  quitApp: () => ipcRenderer.invoke('app:quit'),
  sendTestNotification: () => ipcRenderer.invoke('notifications:test'),
  previewNotificationTone: (tone) => ipcRenderer.invoke('notifications:preview-tone', { tone }),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window:toggle-maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  getWindowState: () => ipcRenderer.invoke('window:get-state'),
  onWindowStateChanged: (listener) => subscribe<WindowState>(WINDOW_STATE_CHANGED_EVENT, listener),
  getSchedulerStatus: () => ipcRenderer.invoke('scheduler:get-status'),
  onSchedulerStatusChanged: (listener) =>
    subscribe<void>(SCHEDULER_STATUS_CHANGED_EVENT, () => listener()),
  listTasks: () => ipcRenderer.invoke('tasks:list'),
  listAutomations: () => ipcRenderer.invoke('automations:list'),
  createAutomation: (input) => ipcRenderer.invoke('automations:create', input),
  updateAutomation: (id, input) => ipcRenderer.invoke('automations:update', { id, input }),
  deleteAutomation: (id) => ipcRenderer.invoke('automations:delete', { id }),
  setAutomationEnabled: (id, enabled) =>
    ipcRenderer.invoke('automations:set-enabled', { id, enabled }),
  listExecutions: () => ipcRenderer.invoke('executions:list'),
  onExecutionsChanged: (listener) => subscribe<void>(EXECUTIONS_CHANGED_EVENT, () => listener()),
  getPreferences: () => ipcRenderer.invoke('preferences:get'),
  updatePreferences: (patch) => ipcRenderer.invoke('preferences:update', patch),
};

contextBridge.exposeInMainWorld('api', api);
