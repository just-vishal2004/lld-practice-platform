import { PrismaClient, Attempt as PrismaAttempt } from '@prisma/client';
import { AttemptRepository } from '../../application/ports';
import { Attempt, AttemptStatus } from '../../domain/Attempt';

function toDomain(row: PrismaAttempt): Attempt {
  return {
    id: row.id,
    problemId: row.problemId,
    learnerId: row.learnerId,
    status: row.status as AttemptStatus,
    submissions: [], // populated separately by the use case when needed
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaAttemptRepository implements AttemptRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(attempt: Attempt): Promise<Attempt> {
    const row = await this.prisma.attempt.create({
      data: {
        id: attempt.id,
        problemId: attempt.problemId,
        learnerId: attempt.learnerId,
        status: attempt.status,
        createdAt: attempt.createdAt,
        updatedAt: attempt.updatedAt,
      },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<Attempt | null> {
    const row = await this.prisma.attempt.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByLearner(learnerId: string, problemId?: string): Promise<Attempt[]> {
    const rows = await this.prisma.attempt.findMany({
      where: { learnerId, ...(problemId ? { problemId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDomain);
  }

  async update(attempt: Attempt): Promise<Attempt> {
    const row = await this.prisma.attempt.update({
      where: { id: attempt.id },
      data: { status: attempt.status, updatedAt: new Date() },
    });
    return toDomain(row);
  }
}
