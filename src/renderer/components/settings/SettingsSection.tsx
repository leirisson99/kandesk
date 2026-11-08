import type { ReactNode } from 'react';
import { Card, CardHeader, Switch } from '@/components/ui';

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="mb-5">
      <CardHeader title={title} description={description} />
      <div className="divide-y divide-slate-200">{children}</div>
    </Card>
  );
}

interface SettingRowProps {
  title: string;
  description?: string;
  /** Controle à direita; por padrão, nada. */
  control?: ReactNode;
}

export function SettingRow({ title, description, control }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-3.5">
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      {control}
    </div>
  );
}

interface SettingSwitchRowProps {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function SettingSwitchRow({
  title,
  description,
  checked,
  onChange,
  disabled,
}: SettingSwitchRowProps) {
  return (
    <SettingRow
      title={title}
      description={description}
      control={<Switch checked={checked} onChange={onChange} label={title} disabled={disabled} />}
    />
  );
}
