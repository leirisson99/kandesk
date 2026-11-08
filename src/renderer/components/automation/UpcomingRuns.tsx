import type { AutomationAction } from '@shared/types/automation';
import { ActionLabel } from '@/components/ActionLabel';

export interface UpcomingRun {
  label: string;
  action: AutomationAction;
}

export function UpcomingRuns({ runs }: { runs: UpcomingRun[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
      <p className="mb-2 text-xs font-bold text-slate-700">Próximas execuções</p>
      {runs.length === 0 && (
        <p className="text-slate-500">
          Preencha dias e horários válidos para ver as próximas execuções.
        </p>
      )}
      <ul className="space-y-1.5">
        {runs.map((run) => (
          <li key={run.label} className="flex justify-between text-slate-700">
            <span>{run.label}</span>
            <ActionLabel action={run.action} />
          </li>
        ))}
      </ul>
    </div>
  );
}
