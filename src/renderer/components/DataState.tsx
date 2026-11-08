import type { ReactNode } from 'react';
import { Alert } from '@/components/ui';

interface DataStateProps {
  loading: boolean;
  error: string | null;
  children: ReactNode;
}

/** Padroniza carregando/erro; renderiza o conteúdo quando não há erro nem carregamento. */
export function DataState({ loading, error, children }: DataStateProps) {
  if (error) {
    return (
      <Alert tone="danger" title="Não foi possível carregar os dados">
        {error}
      </Alert>
    );
  }
  if (loading) return <p className="text-sm text-slate-500">Carregando…</p>;
  return <>{children}</>;
}
