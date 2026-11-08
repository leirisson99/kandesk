import { Card, FormField, Select } from '@/components/ui';
import type { HistoryFilter } from '@/lib/history';

interface HistoryFiltersProps {
  automations: { id: string; name: string }[];
  value: HistoryFilter;
  onChange: (value: HistoryFilter) => void;
}

export function HistoryFilters({ automations, value, onChange }: HistoryFiltersProps) {
  const patch = (partial: Partial<HistoryFilter>) => onChange({ ...value, ...partial });

  return (
    <Card className="mb-5 grid grid-cols-3 gap-4 p-4">
      <FormField label="Automação" htmlFor="f-automation">
        <Select
          id="f-automation"
          value={value.automationId}
          onChange={(e) => patch({ automationId: e.target.value })}
        >
          <option value="ALL">Todas</option>
          {automations.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Ação" htmlFor="f-action">
        <Select
          id="f-action"
          value={value.action}
          onChange={(e) => patch({ action: e.target.value as HistoryFilter['action'] })}
        >
          <option value="ALL">Pausar e retomar</option>
          <option value="PAUSE">Pausar</option>
          <option value="RESUME">Retomar</option>
        </Select>
      </FormField>
      <FormField label="Status" htmlFor="f-status">
        <Select
          id="f-status"
          value={value.status}
          onChange={(e) => patch({ status: e.target.value as HistoryFilter['status'] })}
        >
          <option value="ALL">Todos</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="SKIPPED">SKIPPED</option>
          <option value="MISSED">MISSED</option>
          <option value="ERROR">ERROR</option>
        </Select>
      </FormField>
    </Card>
  );
}
