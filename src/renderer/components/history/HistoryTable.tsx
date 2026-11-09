import type { ExecutionRecord } from '@shared/types/automation';
import { ActionLabel } from '@/components/ActionLabel';
import { Card } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { ExecutionStatusBadge } from './ExecutionStatusBadge';

interface HistoryTableProps {
  records: ExecutionRecord[];
}

const headers = ['Data e hora', 'Automação', 'Ação', 'Status', 'HTTP', 'Mensagem'];

export function HistoryTable({ records }: HistoryTableProps) {
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {records.map((r) => {
            return (
              <tr key={r.id}>
                <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                  {formatDateTime(r.executedAt)}
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{r.automationName}</p>
                  <p className="text-xs text-slate-500">#{r.taskId}</p>
                </td>
                <td className="px-4 py-3">
                  <ActionLabel action={r.action} />
                </td>
                <td className="px-4 py-3">
                  <ExecutionStatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-slate-700">{r.httpStatus ?? '—'}</td>
                <td className="px-4 py-3 text-slate-700">{r.message}</td>
              </tr>
            );
          })}
          {records.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-4 py-8 text-center text-slate-500">
                Nenhuma execução encontrada.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}
