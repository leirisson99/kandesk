import type { ExecutionStatus } from '@shared/types/automation';
import { Badge, type BadgeTone } from '@/components/ui';

const tones: Record<ExecutionStatus, BadgeTone> = {
  SUCCESS: 'success',
  SKIPPED: 'neutral',
  MISSED: 'warning',
  ERROR: 'danger',
};

export function ExecutionStatusBadge({ status }: { status: ExecutionStatus }) {
  return <Badge tone={tones[status]}>{status}</Badge>;
}
