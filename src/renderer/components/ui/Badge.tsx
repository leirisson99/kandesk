import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'success' | 'neutral' | 'warning' | 'danger' | 'info';

const tones: Record<BadgeTone, string> = {
  success: 'bg-emerald-100 text-emerald-800',
  neutral: 'bg-slate-200 text-slate-700',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
};

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-block rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
