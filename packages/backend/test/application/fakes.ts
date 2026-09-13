import { AttemptRepository, ProblemRepository, SubmissionRepository, FeedbackRepository } from '../../src/application/ports';
import { Problem } from '../../src/domain/Problem';
import { Attempt } from '../../src/domain/Attempt';
import { Submission } from '../../src/domain/Submission';
import { Feedback } from '../../src/domain/Evaluation';

/**
 * Simple in-memory fakes implementing the same repository ports the Prisma
 * implementations do. Used to unit-test the application layer's
 * orchestration logic (state transitions, error handling) in complete
 * isolation from any database — including in environments where Prisma's
 * engine cannot be generated.
 */
export class FakeProblemRepository implements ProblemRepository {
  constructor(private readonly problems: Problem[]) {}
  async findAll() {
    return this.problems;
  }
  async findBySlug(slug: string) {
    return this.problems.find((p) => p.slug === slug) ?? null;
  }
  async findById(id: string) {
    return this.problems.find((p) => p.id === id) ?? null;
  }
}

export class FakeAttemptRepository implements AttemptRepository {
  private store = new Map<string, Attempt>();
  async create(attempt: Attempt) {
    this.store.set(attempt.id, attempt);
    return attempt;
  }
  async findById(id: string) {
    return this.store.get(id) ?? null;
  }
  async findByLearner(learnerId: string, problemId?: string) {
    return [...this.store.values()].filter((a) => a.learnerId === learnerId && (!problemId || a.problemId === problemId));
  }
  async update(attempt: Attempt) {
    this.store.set(attempt.id, attempt);
    return attempt;
  }
}

export class FakeSubmissionRepository implements SubmissionRepository {
  private store = new Map<string, Submission>();
  async create(submission: Submission) {
    this.store.set(submission.id, submission);
    return submission;
  }
  async findByAttemptId(attemptId: string) {
    return [...this.store.values()].filter((s) => s.attemptId === attemptId);
  }
  async findLatestByAttemptId(attemptId: string) {
    const all = [...this.store.values()]
      .filter((s) => s.attemptId === attemptId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return all[0] ?? null;
  }
}

export class FakeFeedbackRepository implements FeedbackRepository {
  private store = new Map<string, Feedback>();
  async save(feedback: Feedback) {
    this.store.set(feedback.submissionId, feedback);
    return feedback;
  }
  async findLatestBySubmissionId(submissionId: string) {
    return this.store.get(submissionId) ?? null;
  }
}
