import { StatusDot } from '@/components/ui';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';

/** Estado da conta do Kanban (credencial salva neste computador). */
export function SidebarStatus() {
  const status = useConnectionStatus();
  const configured = status?.configured === true;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
      <p className="flex items-center gap-2 font-bold text-slate-900">
        <StatusDot tone={configured ? 'success' : 'warning'} />
        {configured ? 'Conta configurada' : 'Conta não configurada'}
      </p>
      <p className="mt-1.5">
        {configured
          ? `${status.displayName} · ${status.username}`
          : 'Informe usuário e token em Configurações.'}
      </p>
    </div>
  );
}
