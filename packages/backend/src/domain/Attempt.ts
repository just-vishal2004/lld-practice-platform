import { Submission } from './Submission';

export type AttemptStatus = 'draft' | 'submitted' | 'evaluating' | 'evaluated' | 'failed';

export interface Attempt {
  id: string;
  problemId: string;
  learnerId: string;
  status: AttemptStatus;
  submissions: Submission[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Explicit, centralized state machine. Any transition not listed here is a
 * programming error and throws — this is what "clear domain behaviour"
 * means in practice: illegal states become unrepresentable at runtime, not
 * just undocumented.
 *
 *   draft ----submit----> submitted ----beginEvaluation----> evaluating
 *                                                                |  \
 *                                                    evaluationSucceeds  evaluationFails
 *                                                                |          \
 *                                                            evaluated     failed
 *
 * Note: "Try Again" (per the assignment defaults) creates a brand-new
 * Attempt rather than transitioning an existing one, so there is
 * deliberately no transition back to 'draft' from any other state — each
 * Attempt represents one practice session end-to-end.
 */
const ALLOWED_TRANSITIONS: Record<AttemptStatus, AttemptStatus[]> = {
  draft: ['submitted'],
  submitted: ['evaluating'],
  evaluating: ['evaluated', 'failed'],
  evaluated: [],
  failed: ['evaluating'], // allow retrying evaluation on the same submission
};

export class IllegalAttemptTransitionError extends Error {
  constructor(from: AttemptStatus, to: AttemptStatus) {
    super(`Cannot transition attempt from "${from}" to "${to}".`);
    this.name = 'IllegalAttemptTransitionError';
  }
}

export function canTransition(from: AttemptStatus, to: AttemptStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function transitionAttempt(attempt: Attempt, to: AttemptStatus): Attempt {
  if (!canTransition(attempt.status, to)) {
    throw new IllegalAttemptTransitionError(attempt.status, to);
  }
  return { ...attempt, status: to, updatedAt: new Date() };
}

export function createAttempt(input: {
  id?: string;
  problemId: string;
  learnerId: string;
  createdAt?: Date;
}): Attempt {
  if (!input.problemId) throw new Error('Attempt requires a problemId');
  if (!input.learnerId) throw new Error('Attempt requires a learnerId');
  const now = input.createdAt ?? new Date();
  return {
    id: input.id ?? crypto.randomUUID(),
    problemId: input.problemId,
    learnerId: input.learnerId,
    status: 'draft',
    submissions: [],
    createdAt: now,
    updatedAt: now,
  };
}
