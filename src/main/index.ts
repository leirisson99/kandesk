import { join } from 'node:path';
import { app, Menu, powerMonitor, shell } from 'electron';
import audioHostPath from '../../resources/audio-host.html?asset';
import appIconPath from '../../resources/icon.png?asset';
import alertSoundPath from '../../resources/sounds/alert.wav?asset';
import bellSoundPath from '../../resources/sounds/bell.wav?asset';
import chimeSoundPath from '../../resources/sounds/chime.wav?asset';
import dropSoundPath from '../../resources/sounds/drop.wav?asset';
import pulseSoundPath from '../../resources/sounds/pulse.wav?asset';
import trayIconPath from '../../resources/tray.png?asset';
import { EXECUTIONS_CHANGED_EVENT, SCHEDULER_STATUS_CHANGED_EVENT } from '@shared/constants/events';
import { DEFAULT_PREFERENCES, type Preferences } from '@shared/schemas/preferences';
import { createContainer } from './composition-root';
import { registerIpcHandlers } from './ipc/register-handlers';
import { ElectronNotifier } from './services/electron-notifier';
import { SafeStoragePairingCodeStore } from './services/safe-storage-pairing-store';
import { SafeStorageCredentialStore } from './services/safe-storage-credential-store';
import { SoundPlayer } from './services/sound-player';
import { applyLoginItem, wasStartedHidden } from './services/login-item';
import { TrayController } from './tray/tray-controller';
import { WindowManager } from './window-manager';

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  void main();
}

async function main(): Promise<void> {
  let preferences: Preferences = DEFAULT_PREFERENCES;
  const tray = new TrayController();
  const windows = new WindowManager({
    shouldKeepInTray: () => preferences.keepInTray && tray.available,
    startHidden: wasStartedHidden(),
    iconPath: appIconPath,
    // Sem bandeja a janela fecha de verdade; com bandeja ela só é escondida (não chega aqui).
    onClosed: () => {
      if (process.platform !== 'darwin') app.quit();
    },
  });

  app.on('second-instance', () => windows.show());
  await app.whenReady();

  const sounds = new SoundPlayer(audioHostPath, {
    chime: chimeSoundPath,
    alert: alertSoundPath,
    drop: dropSoundPath,
    bell: bellSoundPath,
    pulse: pulseSoundPath,
  });
  const { db, useCases, scheduler, bridge } = await createContainer(
    join(app.getPath('userData'), 'kandesk.db'),
    {
      notifier: new ElectronNotifier(sounds, () => windows.show()),
      credentials: new SafeStorageCredentialStore(
        join(app.getPath('userData'), 'kanban-credentials.bin'),
      ),
      pairing: new SafeStoragePairingCodeStore(join(app.getPath('userData'), 'bridge-pairing.bin')),
      onHistoryChanged: () => windows.broadcast(EXECUTIONS_CHANGED_EVENT),
      onSchedulerStatusChanged: () => windows.broadcast(SCHEDULER_STATUS_CHANGED_EVENT),
    },
  );
  preferences = await useCases.getPreferences();
  applyLoginItem(preferences.startWithSystem);

  // A barra de título é do app: Windows/Linux não têm menu nativo. No macOS o menu padrão
  // continua (ele provê copiar/colar e ⌘Q).
  if (process.platform !== 'darwin') Menu.setApplicationMenu(null);

  registerIpcHandlers(useCases, {
    window: {
      minimize: () => windows.minimize(),
      toggleMaximize: () => windows.toggleMaximize(),
      close: () => windows.close(),
      getState: () => windows.getState(),
    },
    getSchedulerStatus: () => scheduler.getStatus(),
    onPreferencesChanged: (next) => {
      preferences = next;
      applyLoginItem(next.startWithSystem);
    },
    quit: () => app.quit(),
    openExternal: (url) => shell.openExternal(url),
    sendTestNotification: () => useCases.notifications.sendTest(),
    previewTone: (tone) => sounds.play(tone),
  });

  tray.create({ iconPath: trayIconPath, onOpen: () => windows.show(), onQuit: () => app.quit() });
  windows.create();
  await bridge.start();
  await scheduler.start();

  // Ao acordar do sleep, reavalia na hora (ocorrências vencidas viram MISSED, nunca execução tardia).
  powerMonitor.on('resume', () => void scheduler.refresh());

  app.on('activate', () => windows.show());

  // Encerramento ordenado: para o agendador e só então fecha o banco.
  let shuttingDown = false;
  app.on('before-quit', (event) => {
    windows.markQuitting();
    if (shuttingDown) return;
    shuttingDown = true;
    event.preventDefault();
    void scheduler
      .stop()
      .catch((error: unknown) => console.error('Falha ao parar o agendador:', error))
      .then(() => bridge.stop())
      .catch((error: unknown) => console.error('Falha ao parar a ponte da extensão:', error))
      .finally(() => {
        tray.destroy();
        sounds.dispose();
        db.close();
        app.quit();
      });
  });
}
