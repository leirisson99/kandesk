import { ExternalLink, Zap } from 'lucide-react';
import type { Task } from '@shared/types/automation';
import { Badge, Button, Card } from '@/components/ui';
import { columnTone, formatTimeInColumn } from '@/lib/cards';

interface CardsTableProps {
  cards: Task[];
  now: Date;
  onOpen: (card: Task) => void;
  /** Ausente na versão de avaliação (sem pausa real): o botão não aparece. */
  onCreateAutomation?: (card: Task) => void;
}

const headers = ['Card', 'Sprint', 'Coluna', 'Na coluna há', 'Responsável', 'Ações'];

export function CardsTable({ cards, now, onOpen, onCreateAutomation }: CardsTableProps) {
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {cards.map((card) => (
            <tr key={card.id}>
              <td className="px-4 py-3">
                <p className="font-semibold text-slate-900">{card.title}</p>
                <p className="text-xs text-slate-500">#{card.id}</p>
              </td>
              <td className="px-4 py-3 text-slate-700">{card.projectName}</td>
              <td className="px-4 py-3">
                <Badge tone={columnTone(card.column)}>{card.column}</Badge>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                {formatTimeInColumn(card.movedAt, now)}
              </td>
              <td className="px-4 py-3 text-slate-700">{card.assignee ?? '—'}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => onOpen(card)} title="Abrir no Kanboard">
                    <ExternalLink className="size-3.5" aria-hidden /> Abrir
                  </Button>
                  {onCreateAutomation && (
                    <Button
                      size="sm"
                      onClick={() => onCreateAutomation(card)}
                      title="Criar automação para este card"
                    >
                      <Zap className="size-3.5" aria-hidden /> Automatizar
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {cards.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-4 py-8 text-center text-slate-500">
                Nenhum card encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}
