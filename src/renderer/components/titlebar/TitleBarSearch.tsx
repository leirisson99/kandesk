import { useEffect, useId, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAutomations } from '@/hooks/useAutomations';
import { usePlatform } from '@/hooks/usePlatform';
import { cn } from '@/lib/cn';
import { isSearchShortcut, searchShortcutLabel } from '@/lib/platform';
import { searchAutomations } from '@/lib/search';

/** Campo "Buscar automações" com atalho Ctrl/⌘ + K; escolher um resultado abre a automação. */
export function TitleBarSearch() {
  const platform = usePlatform();
  const navigate = useNavigate();
  const { data, reload } = useAutomations();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const results = searchAutomations(data ?? [], query);
  const showPanel = focused && query.trim() !== '';

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isSearchShortcut(event, platform)) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [platform]);

  const choose = (id: string) => {
    navigate(`/automations?select=${encodeURIComponent(id)}`);
    setQuery('');
    inputRef.current?.blur();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setQuery('');
      inputRef.current?.blur();
    } else if (event.key === 'ArrowDown' && results.length > 0) {
      event.preventDefault();
      setHighlight((i) => (i + 1) % results.length);
    } else if (event.key === 'ArrowUp' && results.length > 0) {
      event.preventDefault();
      setHighlight((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      const picked = results[highlight];
      if (picked) choose(picked.id);
    }
  };

  return (
    <div className="app-no-drag relative">
      <div className="flex h-7 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 focus-within:border-blue-700 focus-within:bg-white">
        <Search className="size-3.5 shrink-0 text-slate-500" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Buscar automações"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder="Buscar automações"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlight(0);
          }}
          onFocus={() => {
            setFocused(true);
            void reload(); // a lista pode ter mudado desde a última busca
          }}
          // Atraso para o clique em um resultado acontecer antes do painel fechar.
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-500"
        />
        <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
          {searchShortcutLabel(platform)}
        </kbd>
      </div>

      {showPanel && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full right-0 left-0 z-50 mt-1 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
        >
          {results.map((a, index) => (
            <li
              key={a.id}
              role="option"
              aria-selected={index === highlight}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(a.id)}
              className={cn(
                'cursor-pointer rounded-md px-3 py-2 text-sm',
                index === highlight ? 'bg-blue-50 text-blue-800' : 'hover:bg-slate-100',
              )}
            >
              <p className="font-semibold">{a.name}</p>
              <p className="text-xs text-slate-500">#{a.taskId}</p>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">Nenhuma automação encontrada.</li>
          )}
        </ul>
      )}
    </div>
  );
}
