import { StatusDot } from '@/components/ui';

/** Estado da integração. Enquanto não houver API real, sempre indica modo demonstração. */
export function SidebarStatus() {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
      <p className="flex items-center gap-2 font-bold text-slate-900">
        <StatusDot tone="warning" />
        Modo demonstração
      </p>
      <p className="mt-1.5">Dados simulados. Nenhuma tarefa real do Kanban é alterada.</p>
    </div>
  );
}
