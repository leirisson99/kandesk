import { Card, FormField, Input, Select } from '@/components/ui';
import type { CardFilter } from '@/lib/cards';

interface CardFiltersProps {
  columns: string[];
  sprints: string[];
  value: CardFilter;
  hiddenArchived: number;
  onChange: (value: CardFilter) => void;
}

export function CardFilters({
  columns,
  sprints,
  value,
  hiddenArchived,
  onChange,
}: CardFiltersProps) {
  const patch = (partial: Partial<CardFilter>) => onChange({ ...value, ...partial });

  return (
    <Card className="mb-5 grid grid-cols-3 gap-4 p-4">
      <FormField label="Buscar" htmlFor="c-query">
        <Input
          id="c-query"
          type="search"
          placeholder="Título, número, coluna ou sprint…"
          value={value.query}
          onChange={(e) => patch({ query: e.target.value })}
        />
      </FormField>
      <FormField label="Coluna" htmlFor="c-column">
        <Select
          id="c-column"
          value={value.column}
          onChange={(e) => patch({ column: e.target.value })}
        >
          <option value="ALL">Todas</option>
          {columns.map((column) => (
            <option key={column} value={column}>
              {column}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Sprint" htmlFor="c-sprint">
        <Select
          id="c-sprint"
          value={value.sprint}
          onChange={(e) => patch({ sprint: e.target.value })}
        >
          <option value="ALL">Todas</option>
          {sprints.map((sprint) => (
            <option key={sprint} value={sprint}>
              {sprint}
            </option>
          ))}
        </Select>
      </FormField>
      <label className="col-span-3 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={value.showArchived}
          onChange={(e) => patch({ showArchived: e.target.checked })}
        />
        Mostrar colunas de arquivo mensal (JUNHO, OUTUBRO…)
        {!value.showArchived && hiddenArchived > 0 && (
          <span className="text-xs text-slate-500">· {hiddenArchived} oculto(s)</span>
        )}
      </label>
    </Card>
  );
}
