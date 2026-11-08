import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type AlertTone = 'warning' | 'info' | 'danger';

const tones: Record<AlertTone, string> = {
  warning: 'border-amber-300 bg-amber-50 text-amber-900',
  info: 'border-slate-200 bg-slate-100 text-slate-700',
  danger: 'border-red-300 bg-red-50 text-red-900',
};

interface AlertProps {
  tone: AlertTone;
  title?: string;
  children?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}

export function Alert({ tone, title, children, icon, action }: AlertProps) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-center gap-3 rounded-lg border px-4 py-3 text-sm', tones[tone])}
    >
      {icon}
      <div className="min-w-0 flex-1">
        {title && <p className="font-bold">{title}</p>}
        {children && <div>{children}</div>}
      </div>
      {action}
    </div>
  );
}
