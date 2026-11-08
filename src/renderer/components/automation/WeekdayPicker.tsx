import type { Weekday } from '@shared/types/automation';
import { cn } from '@/lib/cn';
import { WEEKDAY_SHORT } from '@/lib/format';

const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

interface WeekdayPickerProps {
  value: Weekday[];
  onChange: (days: Weekday[]) => void;
}

export function WeekdayPicker({ value, onChange }: WeekdayPickerProps) {
  const toggle = (day: Weekday) =>
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day]);

  return (
    <div role="group" aria-label="Dias da semana" className="flex flex-wrap gap-2">
      {ALL_DAYS.map((day) => {
        const active = value.includes(day);
        return (
          <button
            key={day}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(day)}
            className={cn(
              'h-11 w-12 rounded-lg border text-xs font-bold',
              active
                ? 'border-blue-700 bg-blue-700 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
            )}
          >
            {WEEKDAY_SHORT[day]}
          </button>
        );
      })}
    </div>
  );
}
