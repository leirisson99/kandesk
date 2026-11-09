import type { Automation } from '@shared/types/automation';
import { Switch } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatWeekdays } from '@/lib/format';

interface AutomationListItemProps {
  automation: Automation;
  taskLabel: string;
  selected: boolean;
  onSelect: () => void;
  onToggle: (enabled: boolean) => void;
  /** false na versão de avaliação: só é possível desativar. */
  canEnable: boolean;
}

export function AutomationListItem({
  automation,
  taskLabel,
  selected,
  onSelect,
  onToggle,
  canEnable,
}: AutomationListItemProps) {
  const { name, pauseAt, resumeAt, weekdays, enabled } = automation;

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border bg-white p-4 shadow-sm',
        selected ? 'border-2 border-blue-700' : 'border-slate-200',
      )}
    >
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
        <p className={cn('font-semibold', enabled ? 'text-slate-900' : 'text-slate-700')}>{name}</p>
        <p className="mt-0.5 text-sm text-slate-500">{taskLabel}</p>
        <p className={cn('mt-2 flex flex-wrap gap-x-3 text-xs', !enabled && 'opacity-50')}>
          <span>
            <b className="text-amber-700">Pausa</b> {pauseAt}
          </span>
          <span>
            <b className="text-blue-700">Retoma</b> {resumeAt}
          </span>
          <span className="text-slate-700">{formatWeekdays(weekdays)}</span>
        </p>
      </button>
      <Switch
        checked={enabled}
        onChange={onToggle}
        label={`Ativar ${name}`}
        disabled={!enabled && !canEnable}
      />
    </div>
  );
}
