import { useSchedulerStatus } from '@/hooks/useSchedulerStatus';
import { cn } from '@/lib/cn';
import { describeSchedulerStatus, type StatusTone } from '@/lib/scheduler-status';

const pill: Record<StatusTone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  neutral: 'border-slate-200 bg-slate-100 text-slate-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-red-200 bg-red-50 text-red-800',
};
const dot: Record<StatusTone, string> = {
  success: 'bg-emerald-500',
  neutral: 'bg-slate-400',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
};

/** Estado do agendador; só informa (não é um controle). */
export function SchedulerStatusPill() {
  const { data, error } = useSchedulerStatus();

  const view = data
    ? describeSchedulerStatus(data)
    : error
      ? { tone: 'danger' as const, label: 'Estado indisponível', detail: error }
      : null;
  if (!view) return null;

  return (
    <span
      role="status"
      title={view.detail}
      className={cn(
        'app-no-drag flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap',
        pill[view.tone],
      )}
    >
      <span aria-hidden className={cn('size-2 rounded-full', dot[view.tone])} />
      {view.label}
    </span>
  );
}
