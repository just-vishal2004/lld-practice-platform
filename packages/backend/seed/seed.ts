import { PrismaClient } from '@prisma/client';
import { SEED_PROBLEMS } from './problems';

const prisma = new PrismaClient();

async function main() {
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
    // eslint-disable-next-line no-console
    console.log(`Seeded problem: ${p.slug}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
