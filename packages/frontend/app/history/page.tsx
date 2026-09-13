import Link from 'next/link';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const [history, problems] = await Promise.all([api.listHistory().catch(() => []), api.listProblems().catch(() => [])]);
  const titleById = new Map(problems.map((p) => [p.id, p.title]));

  return (
    <div>
      <h1>Your practice history</h1>
      <p>Every attempt is kept so you can track improvement across tries, not just see a single result.</p>

      <div className="panel">
        {history.length === 0 ? (
          <div className="empty-state">
            <p>No attempts yet.</p>
            <Link href="/problems" className="btn">
              Browse problems
            </Link>
          </div>
        ) : (
          <ul className="list-plain">
            {history.map((a) => (
              <li key={a.id} className="history-row">
                <div>
                  <div>
                    <strong>{titleById.get(a.problemId) ?? 'Problem'}</strong> <StatusBadge status={a.status} />
                  </div>
                  <div className="history-meta">
                    {new Date(a.createdAt).toLocaleString()}
                    {a.latestFeedbackSummary ? ` — ${a.latestFeedbackSummary}` : ''}
                  </div>
                </div>
                <Link href={`/attempts/${a.id}`} className="btn btn-quiet">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
