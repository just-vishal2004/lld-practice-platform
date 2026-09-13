import { PrismaClient } from '@prisma/client';
import { SEED_PROBLEMS } from '../../seed/problems';

/**
 * Integration tests talk to a real (test) SQLite database rather than
 * mocking Prisma, so the Prisma <-> domain mapping in the repository layer
 * is actually exercised. `resetAndSeed` clears Attempt/Submission/Evaluation
 * (child-to-parent order, since SQLite enforces FK constraints) and
 * upserts the three seed problems by slug - the same pattern the production
 * seed script (seed/seed.ts) already uses - rather than delete+recreate.
 * This keeps each Problem's id stable across repeated calls instead of
 * regenerating a fresh UUID every time, which matters because tests capture
 * a problem id once and reuse it across many assertions.
 */
export async function resetAndSeed(prisma: PrismaClient): Promise<void> {
  await prisma.evaluation.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.attempt.deleteMany();

  for (const p of SEED_PROBLEMS) {
    await prisma.problem.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        summary: p.summary,
        requirementsJson: JSON.stringify(p.requirements),
        constraintsJson: JSON.stringify(p.constraints),
        expectedEntitiesJson: JSON.stringify(p.expectedEntities),
        variationPointsJson: JSON.stringify(p.variationPoints),
      },
      create: {
        slug: p.slug,
        title: p.title,
        summary: p.summary,
        requirementsJson: JSON.stringify(p.requirements),
        constraintsJson: JSON.stringify(p.constraints),
        expectedEntitiesJson: JSON.stringify(p.expectedEntities),
        variationPointsJson: JSON.stringify(p.variationPoints),
      },
    });
  }
}
