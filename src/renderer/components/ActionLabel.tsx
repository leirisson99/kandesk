import type { AutomationAction } from '@shared/types/automation';
import { cn } from '@/lib/cn';

const config: Record<AutomationAction, { label: string; className: string }> = {
  PAUSE: { label: 'Pausar', className: 'text-amber-700' },
  RESUME: { label: 'Retomar', className: 'text-blue-700' },
};

export function ActionLabel({ action }: { action: AutomationAction }) {
  const { label, className } = config[action];
  return <span className={cn('font-semibold', className)}>{label}</span>;
}
