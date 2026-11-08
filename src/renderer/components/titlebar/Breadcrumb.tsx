import { useLocation } from 'react-router-dom';
import { pageLabel } from '@/lib/breadcrumb';
import { Logo } from '@/components/Logo';
import { routes } from '@/routes';

/** Logo, "Kandesk" e a página atual. */
export function Breadcrumb() {
  const { pathname } = useLocation();
  const current = pageLabel(pathname, routes);

  return (
    <nav aria-label="Localização" className="flex min-w-0 items-center gap-2 text-sm">
      <Logo className="size-5 shrink-0" />
      <span className="font-bold text-slate-900">Kandesk</span>
      {current && (
        <>
          <span aria-hidden className="text-slate-400">
            /
          </span>
          <span className="truncate text-slate-600" aria-current="page">
            {current}
          </span>
        </>
      )}
    </nav>
  );
}
