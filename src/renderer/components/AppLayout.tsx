import { Outlet } from 'react-router-dom';
import { useAppInfo } from '@/hooks/useAppInfo';
import { Alert } from '@/components/ui';
import { Sidebar } from './layout/Sidebar';
import { TitleBar } from './titlebar/TitleBar';

export function AppLayout() {
  const { info, error } = useAppInfo();

  return (
    <div className="flex h-screen flex-col bg-slate-100 text-slate-900">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar version={info?.version ?? null} />
        <main className="min-w-0 flex-1 overflow-auto px-8 py-8">
          {error && (
            <div className="mb-4">
              <Alert tone="danger" title="Falha ao comunicar com o processo principal">
                {error}
              </Alert>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
