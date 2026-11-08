import { Link } from 'react-router-dom';
import type { ExecutionStatus } from '@shared/types/automation';
import { ExecutionStatusBadge } from '@/components/history/ExecutionStatusBadge';
import { Card, CardHeader } from '@/components/ui';

export interface RecentExecution {
  id: string;
  when: string;
  automationName: string;
  message: string;
  status: ExecutionStatus;
}

export function RecentExecutions({ items }: { items: RecentExecution[] }) {
  return (
    <Card>
      <CardHeader
        title="Execuções recentes"
        action={
          <Link to="/history" className="text-sm font-semibold text-blue-700 underline">
            Ver tudo
          </Link>
        }
      />
      <ul className="divide-y divide-slate-200">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 px-5 py-3">
            <p className="w-24 text-sm text-slate-500">{item.when}</p>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="font-semibold text-slate-900">{item.automationName}</p>
              <p className="text-xs text-slate-500">{item.message}</p>
            </div>
            <ExecutionStatusBadge status={item.status} />
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-5 py-6 text-center text-sm text-slate-500">Nenhuma execução ainda.</li>
        )}
      </ul>
    </Card>
  );
}
