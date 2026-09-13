import { AttemptRepository, ProblemRepository, SubmissionRepository, FeedbackRepository } from './ports';
import { NotFoundError } from './errors';
import { Attempt, createAttempt } from '../domain/Attempt';

export interface AttemptHistoryEntry {
  attempt: Attempt;
  latestFeedbackSummary: string | null;
}

export class AttemptUseCases {
  constructor(
    private readonly attempts: AttemptRepository,
    private readonly problems: ProblemRepository,
    private readonly submissions: SubmissionRepository,
    private readonly feedbacks: FeedbackRepository,
  ) {}

  /** Also used for "Try Again": callers simply call this again, which always creates a fresh Attempt. */
  async startAttempt(problemId: string, learnerId: string): Promise<Attempt> {
    const problem = await this.problems.findById(problemId);
    if (!problem) throw new NotFoundError('Problem', problemId);
    const attempt = createAttempt({ problemId, learnerId });
    return this.attempts.create(attempt);
  }

  async getAttempt(attemptId: string): Promise<Attempt> {
    const attempt = await this.attempts.findById(attemptId);
    if (!attempt) throw new NotFoundError('Attempt', attemptId);
    const submissions = await this.submissions.findByAttemptId(attemptId);
    return { ...attempt, submissions };
  }

  async listHistory(learnerId: string, problemId?: string): Promise<AttemptHistoryEntry[]> {
    const attempts = await this.attempts.findByLearner(learnerId, problemId);
    const entries: AttemptHistoryEntry[] = [];
    for (const attempt of attempts) {
      const latestSubmission = await this.submissions.findLatestByAttemptId(attempt.id);
      let summary: string | null = null;
      if (latestSubmission) {
        const feedback = await this.feedbacks.findLatestBySubmissionId(latestSubmission.id);
        summary = feedback?.summary ?? null;
      }
      entries.push({ attempt, latestFeedbackSummary: summary });
    }
    // Most recent first
    return entries.sort((a, b) => b.attempt.createdAt.getTime() - a.attempt.createdAt.getTime());
  }
}
