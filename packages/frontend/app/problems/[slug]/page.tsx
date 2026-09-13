import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { StartAttemptButton } from '@/components/StartAttemptButton';
import { StatusBadge } from '@/components/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function ProblemDetailPage({ params }: { params: { slug: string } }) {
  let problem;
  try {
    problem = await api.getProblem(params.slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const history = await api.listHistory(problem.id).catch(() => []);

  return (
    <div>
      <div className="eyebrow">
        <Link href="/problems">← All problems</Link>
      </div>
      <h1>{problem.title}</h1>
      <p>{problem.summary}</p>

      <div className="panel">
        <h2>Requirements</h2>
        <ul className="requirements-list">
          {problem.requirements.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      <div className="panel">
        <h2>Constraints to keep in mind</h2>
        <ul className="constraints-list">
          {problem.constraints.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>

      <div style={{ margin: '24px 0' }}>
        <StartAttemptButton problemId={problem.id} label={history.length > 0 ? 'Try again — start a new attempt' : 'Start attempt'} />
      </div>

      <div className="panel">
        <div className="section-heading-row">
          <h2>Your attempts</h2>
          <span className="history-meta">{history.length} total</span>
        </div>
        {history.length === 0 ? (
          <p className="history-meta">No attempts yet for this problem. Start one above to begin practicing.</p>
        ) : (
          <ul className="list-plain">
            {history.map((a) => (
              <li key={a.id} className="history-row">
                <div>
                  <div>
                    <StatusBadge status={a.status} /> <span className="history-meta">{new Date(a.createdAt).toLocaleString()}</span>
                  </div>
                  {a.latestFeedbackSummary && <div className="history-meta">{a.latestFeedbackSummary}</div>}
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
