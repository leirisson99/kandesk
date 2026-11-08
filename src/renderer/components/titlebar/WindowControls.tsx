import type { ReactNode } from 'react';
import type { AppPlatform, WindowState } from '@shared/types/system';
import { cn } from '@/lib/cn';

interface WindowControlsProps {
  platform: AppPlatform;
  state: WindowState;
}

const run = (action: () => Promise<void>) => () =>
  void action().catch((e: unknown) => console.error('Falha ao controlar a janela:', e));

// Ícones de 10 px, traço fino, como os controles nativos.
const icons = {
  minimize: (
    <svg viewBox="0 0 10 10" className="size-2.5" fill="none" stroke="currentColor" aria-hidden>
      <path d="M0 5h10" />
    </svg>
  ),
  maximize: (
    <svg viewBox="0 0 10 10" className="size-2.5" fill="none" stroke="currentColor" aria-hidden>
      <rect x="0.5" y="0.5" width="9" height="9" />
    </svg>
  ),
  restore: (
    <svg viewBox="0 0 10 10" className="size-2.5" fill="none" stroke="currentColor" aria-hidden>
      <rect x="0.5" y="2.5" width="7" height="7" />
      <path d="M2.5 2.5v-2h7v7h-2" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 10 10" className="size-2.5" fill="none" stroke="currentColor" aria-hidden>
      <path d="M0 0l10 10M10 0L0 10" />
    </svg>
  ),
};

/** Botões de janela desenhados pelo app. No macOS os semáforos são nativos: nada a renderizar. */
export function WindowControls({ platform, state }: WindowControlsProps) {
  if (platform === 'darwin') return null;

  const linux = platform === 'linux';
  const buttons: { label: string; icon: ReactNode; onClick: () => void; danger?: boolean }[] = [
    { label: 'Minimizar', icon: icons.minimize, onClick: run(window.api.minimizeWindow) },
    {
      label: state.maximized ? 'Restaurar' : 'Maximizar',
      icon: state.maximized ? icons.restore : icons.maximize,
      onClick: run(window.api.toggleMaximizeWindow),
    },
    { label: 'Fechar', icon: icons.close, onClick: run(window.api.closeWindow), danger: true },
  ];

  return (
    <div className={cn('app-no-drag flex items-center', linux ? 'ml-1 gap-2 pr-3' : 'h-full')}>
      {buttons.map(({ label, icon, onClick, danger }) => (
        <button
          key={label}
          type="button"
          aria-label={label}
          title={label}
          onClick={onClick}
          className={cn(
            'grid place-items-center text-slate-700 transition-colors',
            linux
              ? 'size-6 rounded-full bg-slate-100 hover:bg-slate-200'
              : 'h-full w-[46px] hover:bg-slate-100',
            danger && !linux && 'hover:bg-red-600 hover:text-white',
          )}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
