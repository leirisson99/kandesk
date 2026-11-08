import { useState } from 'react';
import { NOTIFICATION_TONES, type NotificationTone } from '@shared/constants/notification-tones';
import { errorMessage } from '@/lib/errors';
import { TONE_LABELS } from '@/lib/notification-tones';
import type { Preferences } from '@shared/schemas/preferences';
import { useAppInfo } from '@/hooks/useAppInfo';
import { usePreferences } from '@/hooks/usePreferences';
import { Info } from 'lucide-react';
import { Badge, Alert, Button, PageHeader, Select } from '@/components/ui';
import {
  SettingRow,
  SettingSwitchRow,
  SettingsSection,
} from '@/components/settings/SettingsSection';

/** Preferências do tipo liga/desliga (as demais têm controles próprios). */
type BooleanPreference = {
  [K in keyof Preferences]: Preferences[K] extends boolean ? K : never;
}[keyof Preferences];

export function SettingsPage() {
  const { preferences, error, update } = usePreferences();
  const { info } = useAppInfo();
  const [testError, setTestError] = useState<string | null>(null);
  const sendTest = async () => {
    try {
      setTestError(null);
      await window.api.sendTestNotification();
    } catch (e) {
      setTestError(errorMessage(e));
    }
  };
  const preview = async (tone: NotificationTone) => {
    try {
      setTestError(null);
      await window.api.previewNotificationTone(tone);
    } catch (e) {
      setTestError(errorMessage(e));
    }
  };
  const chooseTone = async (tone: NotificationTone) => {
    await update({ notificationTone: tone });
    await preview(tone); // ouvir ao escolher
  };
  const loginItemSupported = info?.platform !== 'linux';

  if (error && !preferences) {
    return (
      <Alert tone="danger" title="Não foi possível carregar as preferências">
        {error}
      </Alert>
    );
  }
  if (!preferences) return <p className="text-sm text-slate-500">Carregando…</p>;

  const bind = (key: BooleanPreference) => ({
    checked: preferences[key],
    onChange: (value: boolean) => void update({ [key]: value }),
  });

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Comportamento em segundo plano e notificações."
      />

      {testError && (
        <div className="mb-5">
          <Alert tone="danger" title="Não foi possível enviar a notificação de teste">
            {testError}
          </Alert>
        </div>
      )}

      {error && (
        <div className="mb-5">
          <Alert tone="danger" title="Não foi possível salvar a preferência">
            {error}
          </Alert>
        </div>
      )}

      <div className="mb-5">
        <Alert tone="info" icon={<Info className="size-4 shrink-0" aria-hidden />}>
          A conexão com a API do Kanban ainda não está disponível. Nesta etapa as ações são
          simuladas e as preferências abaixo são salvas localmente, mas ainda não alteram o
          comportamento do app.
        </Alert>
      </div>

      <SettingsSection
        title="Segundo plano"
        description="Nada é executado com o app encerrado, o computador desligado ou suspenso."
      >
        <SettingSwitchRow
          title="Iniciar com o sistema"
          description={
            loginItemSupported
              ? 'Abre minimizado na bandeja ao fazer login (apenas no app instalado).'
              : 'Não suportado no Linux nesta versão.'
          }
          disabled={!loginItemSupported}
          {...bind('startWithSystem')}
        />
        <SettingSwitchRow
          title="Fechar a janela mantém o app na bandeja"
          description="Use “Sair” para encerrar e cancelar os agendamentos em memória."
          {...bind('keepInTray')}
        />
        <SettingRow
          title="Ocorrências perdidas"
          description="Registrar como MISSED e avisar, sem executar ao retomar."
          control={<Badge tone="neutral">Somente registrar</Badge>}
        />
      </SettingsSection>

      <SettingsSection
        title="Notificações"
        description="Notificações nativas do sistema, sem detalhes internos da API."
      >
        <SettingSwitchRow
          title="Tocar som nas notificações"
          description="Reproduz o toque escolhido abaixo junto de cada notificação."
          {...bind('notificationSound')}
        />
        <SettingRow
          title="Toque"
          description="Usado em todas as notificações. Ao escolher, o toque é reproduzido."
          control={
            <div className="flex items-center gap-2">
              <Select
                aria-label="Toque da notificação"
                className="w-36"
                value={preferences.notificationTone}
                disabled={!preferences.notificationSound}
                onChange={(e) => void chooseTone(e.target.value as NotificationTone)}
              >
                {NOTIFICATION_TONES.map((tone) => (
                  <option key={tone} value={tone}>
                    {TONE_LABELS[tone]}
                  </option>
                ))}
              </Select>
              <Button
                size="sm"
                disabled={!preferences.notificationSound}
                onClick={() => void preview(preferences.notificationTone)}
              >
                Ouvir
              </Button>
            </div>
          }
        />
        <SettingSwitchRow title="Ação executada com sucesso" {...bind('notifySuccess')} />
        <SettingSwitchRow title="Falha de autenticação" {...bind('notifyAuthFailure')} />
        <SettingSwitchRow
          title="Falha de comunicação após esgotar tentativas"
          {...bind('notifyCommFailure')}
        />
        <SettingSwitchRow title="Ocorrência perdida detectada" {...bind('notifyMissed')} />
        <SettingRow
          title="Testar notificação"
          description="Envia uma notificação de exemplo, com o som atual."
          control={<Button onClick={() => void sendTest()}>Testar</Button>}
        />
      </SettingsSection>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Kandesk · dados de demonstração</p>
        <Button variant="danger" onClick={() => void window.api.quitApp()}>
          Sair do aplicativo
        </Button>
      </div>
    </>
  );
}
