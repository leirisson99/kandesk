import { useState } from 'react';
import { Alert, Badge, Button } from '@/components/ui';
import { SettingRow, SettingsSection } from '@/components/settings/SettingsSection';
import { useBridgeStatus } from '@/hooks/useBridgeStatus';
import { errorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';

/** Pareamento com a extensão do navegador, que executa a pausa no Kanboard. */
export function BridgeSection() {
  const { status, error, regenerate } = useBridgeStatus();
  const [revealed, setRevealed] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const copy = async () => {
    try {
      setCopyError(null);
      await navigator.clipboard.writeText(status?.pairingCode ?? '');
    } catch (e) {
      setCopyError(errorMessage(e));
    }
  };

  const code = status?.pairingCode ?? '';
  const shown = revealed ? code : '•'.repeat(Math.min(code.length, 24));

  return (
    <SettingsSection
      title="Extensão do navegador"
      description="A pausa é feita pela extensão no Chrome, que já tem sua sessão do Kanboard. O app só conversa com ela neste computador."
    >
      <div className="space-y-4 px-5 py-4">
        {(error || status?.error) && (
          <Alert tone="danger" title="Ponte com a extensão indisponível">
            {error ?? status?.error}
          </Alert>
        )}
        {copyError && (
          <Alert tone="danger" title="Não foi possível copiar">
            {copyError}
          </Alert>
        )}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-slate-600">Extensão:</span>
          {status?.connected ? (
            <Badge tone="success">Conectada</Badge>
          ) : (
            <Badge tone="neutral">Não conectada</Badge>
          )}
          {status?.lastSeenAt && (
            <span className="text-xs text-slate-500">
              última vez vista em {formatDateTime(status.lastSeenAt)}
            </span>
          )}
          {status?.port && (
            <span className="text-xs text-slate-500">
              porta {status.port} (somente este computador)
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">
          Funciona com o Chrome aberto e logado no Kanboard. Pode haver até cerca de 1 minuto de
          atraso entre o horário da automação e a pausa.
        </p>
      </div>
      <SettingRow
        title="Código de pareamento"
        description="Cole este código nas opções da extensão. Não é o token do Kanboard."
        control={
          <div className="flex items-center gap-2">
            <code className="rounded bg-slate-100 px-2 py-1 text-xs break-all text-slate-800">
              {code ? shown : '—'}
            </code>
            <Button size="sm" disabled={!code} onClick={() => setRevealed((v) => !v)}>
              {revealed ? 'Ocultar' : 'Mostrar'}
            </Button>
            <Button size="sm" disabled={!code} onClick={() => void copy()}>
              Copiar
            </Button>
          </div>
        }
      />
      <SettingRow
        title="Gerar novo código"
        description="O código atual deixa de valer; a extensão precisará ser pareada de novo."
        control={
          confirming ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  setConfirming(false);
                  setRevealed(false);
                  void regenerate();
                }}
              >
                Confirmar
              </Button>
              <Button size="sm" onClick={() => setConfirming(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => setConfirming(true)}>
              Gerar novo
            </Button>
          )
        }
      />
    </SettingsSection>
  );
}
