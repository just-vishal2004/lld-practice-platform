import { Problem } from '../domain/Problem';
import { Submission } from '../domain/Submission';
import { EvaluationResult, EvaluatorKind } from '../domain/Evaluation';

/**
 * The single contract every evaluation strategy implements. This is the
 * answer to the assignment's design question "how would your design
 * accommodate another evaluation approach later": a new evaluator (e.g. a
 * static-analysis checker, a rubric-scoring model, a peer-review queue) is a
 * new class implementing this interface plus one line registering it — the
 * application layer, API, and persistence never change.
 */
export interface Evaluator {
  readonly kind: EvaluatorKind;
  evaluate(problem: Problem, submission: Submission): Promise<EvaluationResult>;
}
