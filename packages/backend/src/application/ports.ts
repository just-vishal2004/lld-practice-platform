import { Problem } from '../domain/Problem';
import { Attempt } from '../domain/Attempt';
import { Submission } from '../domain/Submission';
import { Feedback } from '../domain/Evaluation';

/**
 * Repository ports. These interfaces know nothing about Prisma, SQL, or
 * SQLite — they speak only in domain types. The `infra/prisma` package
 * implements these against Prisma today; swapping to PostgreSQL later means
 * changing the Prisma datasource provider (one line), and swapping ORMs
 * entirely would mean writing a new adapter class without touching the
 * application layer or anything above it.
 */
export interface ProblemRepository {
  findAll(): Promise<Problem[]>;
  findBySlug(slug: string): Promise<Problem | null>;
  findById(id: string): Promise<Problem | null>;
}

export interface AttemptRepository {
  create(attempt: Attempt): Promise<Attempt>;
  findById(id: string): Promise<Attempt | null>;
  findByLearner(learnerId: string, problemId?: string): Promise<Attempt[]>;
  update(attempt: Attempt): Promise<Attempt>;
}

export interface SubmissionRepository {
  create(submission: Submission): Promise<Submission>;
  findByAttemptId(attemptId: string): Promise<Submission[]>;
  findLatestByAttemptId(attemptId: string): Promise<Submission | null>;
}

export interface FeedbackRepository {
  save(feedback: Feedback): Promise<Feedback>;
  findLatestBySubmissionId(submissionId: string): Promise<Feedback | null>;
}
