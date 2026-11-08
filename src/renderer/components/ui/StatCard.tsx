import type { ReactNode } from 'react';
import { Card } from './Card';

interface StatCardProps {
  label: string;
  value: ReactNode;
  suffix?: string;
  caption?: string;
}

export function StatCard({ label, value, suffix, caption }: StatCardProps) {
  return (
    <Card className="px-4 py-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 flex items-baseline gap-1.5 text-xl font-bold text-slate-900">
        {value}
        {suffix && <span className="text-sm font-normal text-slate-500">{suffix}</span>}
      </p>
      {caption && <p className="mt-1 text-xs text-slate-500">{caption}</p>}
    </Card>
  );
}
