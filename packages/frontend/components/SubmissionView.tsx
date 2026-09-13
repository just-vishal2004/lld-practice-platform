import { Submission } from '@/lib/types';

export function SubmissionView({ submission }: { submission: Submission }) {
  return (
    <div className="panel">
      <h3>Submitted design</h3>
      {submission.content.entities.map((e, i) => (
        <div className="entity-card" key={i}>
          <div className="entity-card-head">
            <span className="mono" style={{ fontWeight: 600 }}>
              {e.name}
            </span>
            <span className="tag" style={{ color: 'var(--slate)' }}>
              {e.kind}
            </span>
          </div>
          <ul className="list-plain">
            {e.responsibilities.map((r, ri) => (
              <li key={ri} style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', marginBottom: 4 }}>
                • {r}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {submission.content.relationships.length > 0 && (
        <>
          <h3>Relationships</h3>
          <ul className="list-plain">
            {submission.content.relationships.map((r, i) => (
              <li key={i} className="mono" style={{ fontSize: '0.88rem', marginBottom: 6, color: 'var(--ink-soft)' }}>
                {r.from} — {r.type} → {r.to}
              </li>
            ))}
          </ul>
        </>
      )}

      <h3>Rationale</h3>
      <p style={{ color: 'var(--ink-soft)' }}>{submission.content.rationale}</p>
    </div>
  );
}
