import { Feedback, Finding } from '@/lib/types';

function FindingCard({ finding, kind }: { finding: Finding; kind: 'issue' | 'suggestion' | 'strength' }) {
  const cls = kind === 'issue' ? 'finding-issue' : kind === 'suggestion' ? 'finding-suggestion' : 'finding-strength';
  return (
    <div className={`finding ${cls}`}>
      <div className="finding-message">{finding.message}</div>
      <div className="finding-explanation">{finding.explanation}</div>
      {finding.suggestion && <div className="finding-suggestion-text">{finding.suggestion}</div>}
    </div>
  );
}

function EvaluatorColumn({
  title,
  description,
  status,
  errorMessage,
  strengths,
  findings,
}: {
  title: string;
  description: string;
  status: string;
  errorMessage?: string;
  strengths: Finding[];
  findings: Finding[];
}) {
  const issues = findings.filter((f) => f.severity === 'issue');
  const suggestions = findings.filter((f) => f.severity !== 'issue');

  return (
    <div>
      <h3>{title}</h3>
      <p className="history-meta">{description}</p>

      {status !== 'ok' && (
        <div className="unavailable-note">
          {status === 'unavailable' ? '⚠ ' : '⚠ '}
          {errorMessage}
        </div>
      )}

      {strengths.length === 0 && issues.length === 0 && suggestions.length === 0 && status === 'ok' && (
        <p className="history-meta">No notes from this evaluator.</p>
      )}

      {strengths.map((s, i) => (
        <FindingCard key={`s-${i}`} finding={s} kind="strength" />
      ))}
      {issues.map((f, i) => (
        <FindingCard key={`i-${i}`} finding={f} kind="issue" />
      ))}
      {suggestions.map((f, i) => (
        <FindingCard key={`sg-${i}`} finding={f} kind="suggestion" />
      ))}
    </div>
  );
}

export function FeedbackPanel({ feedback }: { feedback: Feedback }) {
  return (
    <div>
      <div className="summary-banner">{feedback.summary}</div>
      <div className="feedback-columns">
        <EvaluatorColumn
          title="Requirement & structure check"
          description="Deterministic — same submission always gets the same result."
          status={feedback.deterministic.status}
          errorMessage={feedback.deterministic.errorMessage}
          strengths={feedback.deterministic.strengths}
          findings={feedback.deterministic.findings}
        />
        <EvaluatorColumn
          title="Design quality (AI)"
          description="Qualitative — cohesion, coupling, patterns, and trade-offs. There is no single correct design."
          status={feedback.qualitative.status}
          errorMessage={feedback.qualitative.errorMessage}
          strengths={feedback.qualitative.strengths}
          findings={feedback.qualitative.findings}
        />
      </div>
    </div>
  );
}
