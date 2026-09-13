import { Problem } from '../domain/Problem';
import { Submission } from '../domain/Submission';
import { Feedback, buildSummary } from '../domain/Evaluation';
import { Evaluator } from './Evaluator';

/**
 * Runs every registered evaluator and aggregates results into one Feedback
 * object. Deliberately NOT a queue/worker system (per the assignment's
 * scope boundary): evaluation runs in-process and synchronously from the
 * caller's perspective, but the Attempt status machinery
 * (submitted -> evaluating -> evaluated/failed) models it as if it could be
 * async, which is the "light HLD consideration" the assignment asks for
 * without building actual distributed infrastructure.
 *
 * Adding a new evaluation approach later (e.g. a static-analysis checker)
 * means implementing Evaluator and passing it into the constructor list —
 * this class and everything above it never changes.
 */
export class EvaluationService {
  constructor(private readonly deterministic: Evaluator, private readonly qualitative: Evaluator) {}

  async evaluate(problem: Problem, submission: Submission): Promise<Feedback> {
    const deterministicResult = await this.deterministic.evaluate(problem, submission);

    // Qualitative evaluation is best-effort: if it throws unexpectedly despite
    // LLMEvaluator's own internal handling, we still don't want to fail the
    // whole attempt.
    let qualitativeResult;
    try {
      qualitativeResult = await this.qualitative.evaluate(problem, submission);
    } catch (err) {
      qualitativeResult = {
        evaluatorKind: 'llm' as const,
        status: 'error' as const,
        findings: [],
        strengths: [],
        errorMessage: `Unexpected evaluator failure: ${(err as Error).message}`,
      };
    }

    return {
      attemptId: submission.attemptId,
      submissionId: submission.id,
      deterministic: deterministicResult,
      qualitative: qualitativeResult,
      summary: buildSummary(deterministicResult, qualitativeResult),
    };
  }
}
