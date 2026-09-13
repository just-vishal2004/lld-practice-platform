import { PrismaClient, Submission as PrismaSubmission } from '@prisma/client';
import { SubmissionRepository } from '../../application/ports';
import { Submission, SubmissionContent, SubmissionFormat } from '../../domain/Submission';

function toDomain(row: PrismaSubmission): Submission {
  return {
    id: row.id,
    attemptId: row.attemptId,
    format: row.format as SubmissionFormat,
    content: JSON.parse(row.contentJson) as SubmissionContent,
    createdAt: row.createdAt,
  };
}

export class PrismaSubmissionRepository implements SubmissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(submission: Submission): Promise<Submission> {
    const row = await this.prisma.submission.create({
      data: {
        id: submission.id,
        attemptId: submission.attemptId,
        format: submission.format,
        contentJson: JSON.stringify(submission.content),
        createdAt: submission.createdAt,
      },
    });
    return toDomain(row);
  }

  async findByAttemptId(attemptId: string): Promise<Submission[]> {
    const rows = await this.prisma.submission.findMany({ where: { attemptId }, orderBy: { createdAt: 'asc' } });
    return rows.map(toDomain);
  }

  async findLatestByAttemptId(attemptId: string): Promise<Submission | null> {
    const row = await this.prisma.submission.findFirst({ where: { attemptId }, orderBy: { createdAt: 'desc' } });
    return row ? toDomain(row) : null;
  }
}
