import { useEffect, useRef, useState } from 'react';
import { Ellipsis, Power, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppInfo } from '@/hooks/useAppInfo';

/** Menu "⋯": Configurações, versão do app e Sair. */
export function TitleBarMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { info } = useAppInfo();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const itemClass =
    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100';

  return (
    <div ref={rootRef} className="app-no-drag relative">
      <button
        type="button"
        aria-label="Mais opções"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid size-7 place-items-center rounded-md text-slate-700 hover:bg-slate-100"
      >
        <Ellipsis className="size-4" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-50 mt-1 w-60 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
        >
          <button
            role="menuitem"
            type="button"
            className={itemClass}
            onClick={() => {
              setOpen(false);
              navigate('/settings');
            }}
          >
            <Settings className="size-4" aria-hidden /> Configurações
          </button>
          <div className="my-1 border-t border-slate-200" />
          <p className="px-3 py-1.5 text-xs text-slate-500">
            Kandesk {info ? `v${info.version}` : ''} · modo demonstração
          </p>
          <div className="my-1 border-t border-slate-200" />
          <button
            role="menuitem"
            type="button"
            className={`${itemClass} text-red-700`}
            onClick={() => void window.api.quitApp()}
          >
            <Power className="size-4" aria-hidden /> Sair do aplicativo
          </button>
        </div>
      )}
    </div>
  );
}
