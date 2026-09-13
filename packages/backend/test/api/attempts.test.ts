import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { buildContainer } from '../../src/container';
import { createApp } from '../../src/api/app';
import { resetAndSeed } from './testDb';

describe('Attempt + Submission journey', () => {
  const prisma = new PrismaClient();
  const container = buildContainer(prisma);
  const app = createApp(container);

  let parkingLotProblemId: string;

  beforeAll(async () => {
    await resetAndSeed(prisma);
    const problem = await prisma.problem.findUniqueOrThrow({ where: { slug: 'parking-lot' } });
    parkingLotProblemId = problem.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects starting an attempt for a nonexistent problem', async () => {
    const res = await request(app).post('/api/attempts').send({ problemId: 'not-a-real-id' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NotFoundError');
  });

  it('starts an attempt in draft status', async () => {
    const res = await request(app).post('/api/attempts').send({ problemId: parkingLotProblemId });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('draft');
    expect(res.body.problemId).toBe(parkingLotProblemId);
  });

  it('runs the full journey: submit a valid solution and receive feedback, then it appears in history', async () => {
    const startRes = await request(app).post('/api/attempts').send({ problemId: parkingLotProblemId });
    const attemptId = startRes.body.id;

    const submitRes = await request(app)
      .post(`/api/attempts/${attemptId}/submissions`)
      .send({
        format: 'structured-oop',
        content: {
          entities: [
            { name: 'Vehicle', kind: 'interface', responsibilities: ['Represent a vehicle needing a spot'] },
            { name: 'ParkingSpot', kind: 'class', responsibilities: ['Track occupancy', 'Track size'] },
            { name: 'Level', kind: 'class', responsibilities: ['Group spots on one floor'] },
            { name: 'ParkingLot', kind: 'class', responsibilities: ['Coordinate levels and spots'] },
            { name: 'PricingStrategy', kind: 'interface', responsibilities: ['Calculate a fee for a session'] },
            { name: 'HourlyPricing', kind: 'class', responsibilities: ['Implement an hourly pricing rule'] },
          ],
          relationships: [
            { from: 'ParkingLot', to: 'Level', type: 'composes' },
            { from: 'Level', to: 'ParkingSpot', type: 'composes' },
            { from: 'ParkingSpot', to: 'Vehicle', type: 'uses' },
            { from: 'HourlyPricing', to: 'PricingStrategy', type: 'implements' },
            { from: 'ParkingLot', to: 'PricingStrategy', type: 'uses' },
          ],
          rationale:
            'PricingStrategy is abstracted behind an interface so new pricing rules can be added without touching ParkingLot. Vehicle is an interface so multiple vehicle types can be supported.',
        },
      });

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.status).toBe('evaluated');
    expect(submitRes.body.feedback).toBeTruthy();
    expect(submitRes.body.feedback.deterministic.status).toBe('ok');
    // No ANTHROPIC_API_KEY is set in the test environment, so qualitative
    // feedback must degrade gracefully rather than failing the request.
    expect(submitRes.body.feedback.qualitative.status).toBe('unavailable');
    expect(submitRes.body.feedback.summary).toContain('AI design-quality feedback was unavailable');

    // Well-formed submission covering all required entities + both variation
    // points should show zero blocking issues.
    const issues = submitRes.body.feedback.deterministic.findings.filter((f: { severity: string }) => f.severity === 'issue');
    expect(issues).toHaveLength(0);

    const feedbackRes = await request(app).get(`/api/attempts/${attemptId}/feedback`);
    expect(feedbackRes.status).toBe(200);
    expect(feedbackRes.body.status).toBe('evaluated');
    expect(feedbackRes.body.feedback.submissionId).toBe(submitRes.body.submissionId);

    const historyRes = await request(app).get('/api/attempts').query({ problemId: parkingLotProblemId });
    expect(historyRes.status).toBe(200);
    const entry = historyRes.body.find((a: { id: string }) => a.id === attemptId);
    expect(entry).toBeTruthy();
    expect(entry.latestFeedbackSummary).toBeTruthy();
  });

  it('rejects a structurally invalid submission with a 400 and issue list (missing responsibilities, empty entities)', async () => {
    const startRes = await request(app).post('/api/attempts').send({ problemId: parkingLotProblemId });
    const attemptId = startRes.body.id;

    const res = await request(app)
      .post(`/api/attempts/${attemptId}/submissions`)
      .send({ format: 'structured-oop', content: { entities: [], relationships: [], rationale: '' } });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('SubmissionValidationError');
    expect(res.body.issues.length).toBeGreaterThan(0);
  });

  it('rejects a submission with duplicate entity names', async () => {
    const startRes = await request(app).post('/api/attempts').send({ problemId: parkingLotProblemId });
    const attemptId = startRes.body.id;

    const res = await request(app)
      .post(`/api/attempts/${attemptId}/submissions`)
      .send({
        format: 'structured-oop',
        content: {
          entities: [
            { name: 'Vehicle', kind: 'class', responsibilities: ['A'] },
            { name: 'Vehicle', kind: 'class', responsibilities: ['B'] },
          ],
          relationships: [],
          rationale: 'Testing duplicate entity name rejection end-to-end via the API.',
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.issues.some((i: string) => i.toLowerCase().includes('duplicate entity name'))).toBe(true);
  });

  it('rejects a repeated submission on an already-evaluated attempt with 409 (Try Again should start a new attempt instead)', async () => {
    const startRes = await request(app).post('/api/attempts').send({ problemId: parkingLotProblemId });
    const attemptId = startRes.body.id;

    const validBody = {
      format: 'structured-oop',
      content: {
        entities: [{ name: 'Vehicle', kind: 'class', responsibilities: ['Represents a vehicle'] }],
        relationships: [],
        rationale: 'Minimal valid submission for repeated-submission test.',
      },
    };

    const first = await request(app).post(`/api/attempts/${attemptId}/submissions`).send(validBody);
    expect(first.status).toBe(201);

    const second = await request(app).post(`/api/attempts/${attemptId}/submissions`).send(validBody);
    expect(second.status).toBe(409);
    expect(second.body.error).toBe('IllegalStateError');
  });

  it('"Try Again" (starting a new attempt for the same problem) creates a separate attempt with its own history entry', async () => {
    const first = await request(app).post('/api/attempts').send({ problemId: parkingLotProblemId });
    const second = await request(app).post('/api/attempts').send({ problemId: parkingLotProblemId });
    expect(first.body.id).not.toBe(second.body.id);

    const historyRes = await request(app).get('/api/attempts').query({ problemId: parkingLotProblemId });
    const ids = historyRes.body.map((a: { id: string }) => a.id);
    expect(ids).toContain(first.body.id);
    expect(ids).toContain(second.body.id);
  });

  it('returns 404 when submitting to a nonexistent attempt', async () => {
    const res = await request(app)
      .post('/api/attempts/not-a-real-attempt-id/submissions')
      .send({
        format: 'structured-oop',
        content: { entities: [{ name: 'X', kind: 'class', responsibilities: ['y'] }], relationships: [], rationale: 'irrelevant test rationale' },
      });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NotFoundError');
  });

  it('returns 400 for a malformed request body caught by Zod (e.g. missing problemId)', async () => {
    const res = await request(app).post('/api/attempts').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ValidationError');
  });
});
