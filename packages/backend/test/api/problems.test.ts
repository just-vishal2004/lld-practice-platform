import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { buildContainer } from '../../src/container';
import { createApp } from '../../src/api/app';
import { resetAndSeed } from './testDb';

describe('GET /api/problems', () => {
  const prisma = new PrismaClient();
  const container = buildContainer(prisma);
  const app = createApp(container);

  beforeAll(async () => {
    await resetAndSeed(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('lists all seeded problems as summaries', async () => {
    const res = await request(app).get('/api/problems');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    const slugs = res.body.map((p: { slug: string }) => p.slug).sort();
    expect(slugs).toEqual(['elevator', 'parking-lot', 'vending-machine']);
    // Summary shape should not leak full requirement/constraint arrays.
    expect(res.body[0]).not.toHaveProperty('requirements');
  });

  it('returns full problem detail by slug, without leaking evaluator-internal hints', async () => {
    const res = await request(app).get('/api/problems/parking-lot');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Parking Lot');
    expect(Array.isArray(res.body.requirements)).toBe(true);
    expect(res.body.requirements.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body.constraints)).toBe(true);
    // expectedEntities/variationPoints are evaluator-internal (used only by
    // DeterministicEvaluator) and must never be sent to the learner-facing
    // problem detail endpoint - that would hand out the answer key.
    expect(res.body).not.toHaveProperty('expectedEntities');
    expect(res.body).not.toHaveProperty('variationPoints');
  });

  it('returns 404 for an unknown problem slug', async () => {
    const res = await request(app).get('/api/problems/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NotFoundError');
  });
});
