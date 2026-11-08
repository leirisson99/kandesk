import { Info } from 'lucide-react';
import { Alert } from '@/components/ui';

/** Identifica dados fictícios (CLAUDE.md: dados simulados devem ser claramente marcados). */
export function DemoNotice() {
  return (
    <div className="mb-4">
      <Alert tone="info" icon={<Info className="size-4 shrink-0" aria-hidden />}>
        Dados de demonstração: nada nesta tela vem do Kanban real.
      </Alert>
    </div>
  );
}
