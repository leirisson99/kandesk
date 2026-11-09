import { useState, type FormEvent } from 'react';
import { Alert, Badge, Button, FormField, Input } from '@/components/ui';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { useConnection } from '@/hooks/useConnection';

export function ConnectionSection() {
  const { status, error, notice, busy, connect, test, disconnect } = useConnection();
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await connect({ username, token });
    if (ok) {
      setToken(''); // o token não permanece na interface depois de salvo
      setUsername('');
    }
  };

  return (
    <SettingsSection
      title="Conexão com o Kanban"
      description="Usuário e token da API do Kanboard. O token é guardado cifrado neste computador e nunca é exibido."
    >
      <div className="space-y-4 px-5 py-4">
        {error && (
          <Alert tone="danger" title="Não foi possível concluir">
            {error}
          </Alert>
        )}
        {notice && !error && <Alert tone="info">{notice}</Alert>}
        {status && !status.secureStorageAvailable && (
          <Alert tone="warning" title="Armazenamento seguro indisponível">
            Este sistema não oferece um cofre de credenciais (no Linux, instale e desbloqueie o
            gnome-keyring ou o KWallet). Sem ele o token não será salvo.
          </Alert>
        )}

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-slate-600">Situação:</span>
          {status?.configured ? (
            <>
              <Badge tone="success">Conectado</Badge>
              <span className="text-slate-700">
                {status.displayName} ({status.username})
              </span>
            </>
          ) : (
            <Badge tone="neutral">Não configurado</Badge>
          )}
          <span className="text-xs text-slate-500">{status?.baseUrl}</span>
        </div>

        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => void submit(e)}>
          <FormField label="Usuário" htmlFor="kanban-username">
            <Input
              id="kanban-username"
              autoComplete="off"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </FormField>
          <FormField
            label="Token da API"
            htmlFor="kanban-token"
            hint="Kanboard → seu perfil → API → gerar novo token."
          >
            <Input
              id="kanban-token"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </FormField>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button
              type="submit"
              variant="primary"
              disabled={busy !== null || !status?.secureStorageAvailable || !username || !token}
            >
              {busy === 'connect' ? 'Validando…' : 'Validar e salvar'}
            </Button>
            <Button disabled={busy !== null || !status?.configured} onClick={() => void test()}>
              {busy === 'test' ? 'Testando…' : 'Testar conexão'}
            </Button>
            <Button
              variant="danger"
              disabled={busy !== null || !status?.configured}
              onClick={() => void disconnect()}
            >
              Desconectar
            </Button>
          </div>
        </form>
      </div>
    </SettingsSection>
  );
}
