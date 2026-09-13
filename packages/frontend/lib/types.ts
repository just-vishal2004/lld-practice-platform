export type EntityKind = 'class' | 'interface' | 'enum';
export type RelationshipType = 'inherits' | 'implements' | 'composes' | 'aggregates' | 'uses';

export interface SubmissionEntity {
  name: string;
  kind: EntityKind;
  responsibilities: string[];
}

export interface SubmissionRelationship {
  from: string;
  to: string;
  type: RelationshipType;
}

export interface SubmissionContent {
  entities: SubmissionEntity[];
  relationships: SubmissionRelationship[];
  rationale: string;
}

export interface ProblemSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
}

// NOTE: ExpectedEntityHint/VariationPointHint (evaluator-internal hints used
// by DeterministicEvaluator) are intentionally NOT modeled here. The
// learner-facing problem detail API never sends them - see
// src/api/routes/problems.ts `toPublicProblemDetail` on the backend. They
// still appear post-submission as ordinary Feedback findings.
export interface ProblemDetail extends ProblemSummary {
  requirements: string[];
  constraints: string[];
}

export type AttemptStatus = 'draft' | 'submitted' | 'evaluating' | 'evaluated' | 'failed';

export interface Submission {
  id: string;
  attemptId: string;
  format: string;
  content: SubmissionContent;
  createdAt: string;
}

export interface Attempt {
  id: string;
  problemId: string;
  learnerId: string;
  status: AttemptStatus;
  createdAt: string;
  updatedAt: string;
  submissions: Submission[];
}

export interface AttemptHistoryEntry extends Attempt {
  latestFeedbackSummary: string | null;
}

export type FindingCategory =
  | 'requirement-coverage'
  | 'structural-issue'
  | 'design-quality'
  | 'extensibility'
  | 'pattern-usage'
  | 'strength';

export type FindingSeverity = 'info' | 'suggestion' | 'issue';

export interface Finding {
  category: FindingCategory;
  severity: FindingSeverity;
  message: string;
  explanation: string;
  suggestion?: string;
}

export type EvaluationStatus = 'ok' | 'unavailable' | 'error';

export interface EvaluationResult {
  evaluatorKind: 'deterministic' | 'llm';
  status: EvaluationStatus;
  findings: Finding[];
  strengths: Finding[];
  errorMessage?: string;
}

export interface Feedback {
  attemptId: string;
  submissionId: string;
  deterministic: EvaluationResult;
  qualitative: EvaluationResult;
  summary: string;
}

export interface SubmitResult {
  attemptId: string;
  submissionId: string;
  status: AttemptStatus;
  feedback: Feedback | null;
}

export interface FeedbackResponse {
  status: AttemptStatus;
  feedback: Feedback | null;
}

export interface ApiErrorBody {
  error: string;
  message: string;
  issues?: (string | { message?: string; path?: (string | number)[] })[];
}
