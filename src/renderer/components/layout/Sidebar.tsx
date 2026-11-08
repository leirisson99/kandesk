import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { routes } from '@/routes';
import { SidebarStatus } from './SidebarStatus';

export function Sidebar({ version }: { version: string | null }) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
      <nav aria-label="Principal" className="flex flex-col gap-1 px-3 pt-4">
        {routes.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100',
              )
            }
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-2 p-3">
        <SidebarStatus />
        <p className="px-1 text-xs text-slate-500">Kandesk v{version ?? '…'} · piloto</p>
      </div>
    </aside>
  );
}
