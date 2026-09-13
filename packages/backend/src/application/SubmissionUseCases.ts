import { AttemptRepository, ProblemRepository, SubmissionRepository, FeedbackRepository } from './ports';
import { NotFoundError, IllegalStateError } from './errors';
import { createSubmission, SubmissionContent, SubmissionFormat } from '../domain/Submission';
import { transitionAttempt } from '../domain/Attempt';
import { Feedback } from '../domain/Evaluation';
import { EvaluationService } from '../evaluation/EvaluationService';

export interface SubmitResult {
  attemptId: string;
  submissionId: string;
  status: string;
  feedback: Feedback | null;
}

export class SubmissionUseCases {
  constructor(
    private readonly attempts: AttemptRepository,
    private readonly problems: ProblemRepository,
    private readonly submissions: SubmissionRepository,
    private readonly feedbacks: FeedbackRepository,
    private readonly evaluationService: EvaluationService,
  ) {}

  /**
   * Submits a solution for an attempt and runs evaluation to completion.
   * Modeled with the full draft -> submitted -> evaluating -> evaluated/failed
   * state machine even though execution is synchronous today, so the same
   * use case would work unchanged behind a real queue later (per the
   * assignment's "keep this practical" guidance on evaluation latency/failure).
   *
   * Throws IllegalStateError for repeated submissions on a non-draft attempt
   * (per the product decision: "Try Again" creates a new Attempt instead).
   */
  async submitAndEvaluate(attemptId: string, format: SubmissionFormat, content: SubmissionContent): Promise<SubmitResult> {
    const attempt = await this.attempts.findById(attemptId);
    if (!attempt) throw new NotFoundError('Attempt', attemptId);

    if (attempt.status !== 'draft') {
      throw new IllegalStateError(
        `Attempt ${attemptId} has already been submitted (status: "${attempt.status}"). Start a new attempt ("Try Again") to submit another solution.`,
      );
    }

    const problem = await this.problems.findById(attempt.problemId);
    if (!problem) throw new NotFoundError('Problem', attempt.problemId);

    // Validates structure; throws SubmissionValidationError (400-mapped) on failure.
    const submission = createSubmission({ attemptId, format, content });
    const savedSubmission = await this.submissions.create(submission);

    let current = transitionAttempt(attempt, 'submitted');
    current = transitionAttempt(current, 'evaluating');
    await this.attempts.update(current);

    try {
      const feedback = await this.evaluationService.evaluate(problem, savedSubmission);
      await this.feedbacks.save(feedback);
      current = transitionAttempt(current, 'evaluated');
      await this.attempts.update(current);
      return { attemptId: current.id, submissionId: savedSubmission.id, status: current.status, feedback };
    } catch (err) {
      // Only reached if the deterministic evaluator itself throws unexpectedly
      // (LLM failures are already handled gracefully inside LLMEvaluator).
      current = transitionAttempt(current, 'failed');
      await this.attempts.update(current);
      return { attemptId: current.id, submissionId: savedSubmission.id, status: current.status, feedback: null };
    }
  }

  async getFeedback(attemptId: string): Promise<{ status: string; feedback: Feedback | null }> {
    const attempt = await this.attempts.findById(attemptId);
    if (!attempt) throw new NotFoundError('Attempt', attemptId);

    const latestSubmission = await this.submissions.findLatestByAttemptId(attemptId);
    if (!latestSubmission) return { status: attempt.status, feedback: null };

    const feedback = await this.feedbacks.findLatestBySubmissionId(latestSubmission.id);
    return { status: attempt.status, feedback: feedback ?? null };
  }
}
