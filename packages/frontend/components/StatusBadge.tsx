import { AttemptStatus } from '@/lib/types';

const LABELS: Record<AttemptStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  evaluating: 'Evaluating',
  evaluated: 'Evaluated',
  failed: 'Evaluation failed',
};

export function StatusBadge({ status }: { status: AttemptStatus }) {
  return <span className={`tag status-${status}`}>{LABELS[status]}</span>;
}
