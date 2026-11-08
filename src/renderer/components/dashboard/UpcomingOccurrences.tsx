import type { AutomationAction } from '@shared/types/automation';
import { Link } from 'react-router-dom';
import { ActionLabel } from '@/components/ActionLabel';
import { Card, CardHeader } from '@/components/ui';

export interface Occurrence {
  id: string;
  time: string;
  weekday: string;
  automationName: string;
  timezone: string;
  action: AutomationAction;
}

export function UpcomingOccurrences({
  items,
  emptyMessage = 'Nenhuma ocorrência agendada.',
}: {
  items: Occurrence[];
  emptyMessage?: string;
}) {
  return (
    <Card>
      <CardHeader
        title="Próximas ocorrências"
        action={
          <Link to="/automations" className="text-sm font-semibold text-blue-700 underline">
            Gerenciar
          </Link>
        }
      />
      <ul className="divide-y divide-slate-200">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 px-5 py-3">
            <div className="w-14 leading-tight">
              <p className="font-bold text-slate-900">{item.time}</p>
              <p className="text-xs text-slate-500">{item.weekday}</p>
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="font-semibold text-slate-900">{item.automationName}</p>
              <p className="text-xs text-slate-500">{item.timezone}</p>
            </div>
            <ActionLabel action={item.action} />
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-5 py-6 text-center text-sm text-slate-500">{emptyMessage}</li>
        )}
      </ul>
    </Card>
  );
}
