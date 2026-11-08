import { cn } from '@/lib/cn';

export type DotTone = 'success' | 'warning' | 'danger' | 'neutral';

const tones: Record<DotTone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  neutral: 'bg-slate-400',
};

export function StatusDot({ tone }: { tone: DotTone }) {
  return <span aria-hidden className={cn('inline-block size-2.5 rounded-full', tones[tone])} />;
}
