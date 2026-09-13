import { PrismaClient, Problem as PrismaProblem } from '@prisma/client';
import { ProblemRepository } from '../../application/ports';
import { Problem, ExpectedEntityHint, VariationPointHint } from '../../domain/Problem';

/**
 * Translates between Prisma's flat/JSON-string row shape and the domain's
 * typed Problem. This mapping is the only place that knows the storage
 * representation — the rest of the app never sees a Prisma type.
 */
function toDomain(row: PrismaProblem): Problem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    requirements: JSON.parse(row.requirementsJson) as string[],
    constraints: JSON.parse(row.constraintsJson) as string[],
    expectedEntities: JSON.parse(row.expectedEntitiesJson) as ExpectedEntityHint[],
    variationPoints: JSON.parse(row.variationPointsJson) as VariationPointHint[],
    createdAt: row.createdAt,
  };
}

export class PrismaProblemRepository implements ProblemRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(): Promise<Problem[]> {
    const rows = await this.prisma.problem.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map(toDomain);
  }

  async findBySlug(slug: string): Promise<Problem | null> {
    const row = await this.prisma.problem.findUnique({ where: { slug } });
    return row ? toDomain(row) : null;
  }

  async findById(id: string): Promise<Problem | null> {
    const row = await this.prisma.problem.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }
}
