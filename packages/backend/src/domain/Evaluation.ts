export type EvaluatorKind = 'deterministic' | 'llm';

export type FindingCategory =
  | 'requirement-coverage'
  | 'structural-issue'
  | 'design-quality'
  | 'extensibility'
  | 'pattern-usage'
  | 'strength';

export type FindingSeverity = 'info' | 'suggestion' | 'issue';

/**
 * A single piece of feedback. `explanation` is mandatory and separate from
 * `message` on purpose: the assignment explicitly asks for feedback that
 * *explains* itself, not just a label or a score. `suggestion` makes the
 * finding actionable rather than purely diagnostic.
 */
export interface Finding {
  category: FindingCategory;
  severity: FindingSeverity;
  message: string;
  explanation: string;
  suggestion?: string;
}

export type EvaluationStatus = 'ok' | 'unavailable' | 'error';

export interface EvaluationResult {
  evaluatorKind: EvaluatorKind;
  status: EvaluationStatus;
  findings: Finding[];
  strengths: Finding[];
  errorMessage?: string;
}

/**
 * Aggregated view shown to the learner. Deterministic and qualitative
 * findings are kept in separate buckets end-to-end (never merged into one
 * opaque list) because they answer different questions: "did I cover the
 * requirements / avoid obvious structural mistakes" vs "is this a good
 * design given there's no single correct answer".
 */
export interface Feedback {
  attemptId: string;
  submissionId: string;
  deterministic: EvaluationResult;
  qualitative: EvaluationResult;
  summary: string;
}

export function buildSummary(deterministic: EvaluationResult, qualitative: EvaluationResult): string {
  const issueCount = deterministic.findings.filter((f) => f.severity === 'issue').length;
  const suggestionCount =
    deterministic.findings.filter((f) => f.severity === 'suggestion').length +
    qualitative.findings.filter((f) => f.severity === 'suggestion').length;
  const strengthCount = deterministic.strengths.length + qualitative.strengths.length;

  const parts: string[] = [];
  if (issueCount > 0) {
    parts.push(`${issueCount} requirement/structural issue${issueCount === 1 ? '' : 's'} to address`);
  } else {
    parts.push('No blocking requirement or structural issues');
  }
  if (strengthCount > 0) parts.push(`${strengthCount} strength${strengthCount === 1 ? '' : 's'} identified`);
  if (suggestionCount > 0) parts.push(`${suggestionCount} suggestion${suggestionCount === 1 ? '' : 's'} for improvement`);
  if (qualitative.status !== 'ok') parts.push('AI design-quality feedback was unavailable for this attempt');

  return parts.join('. ') + '.';
}
