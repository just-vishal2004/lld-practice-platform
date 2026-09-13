import { Router } from 'express';
import { Container } from '../../container';
import { asyncHandler } from '../errorHandler';
import { startAttemptSchema, submitSolutionSchema } from '../schemas';
import { MOCK_LEARNER_ID } from '../constants';

function serializeAttempt(attempt: { id: string; problemId: string; learnerId: string; status: string; createdAt: Date; updatedAt: Date; submissions: unknown[] }) {
  return {
    id: attempt.id,
    problemId: attempt.problemId,
    learnerId: attempt.learnerId,
    status: attempt.status,
    createdAt: attempt.createdAt,
    updatedAt: attempt.updatedAt,
    submissions: attempt.submissions,
  };
}

export function attemptsRouter(container: Container): Router {
  const router = Router();

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const body = startAttemptSchema.parse(req.body);
      const attempt = await container.attemptUseCases.startAttempt(body.problemId, MOCK_LEARNER_ID);
      res.status(201).json(serializeAttempt({ ...attempt, submissions: [] }));
    }),
  );

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const problemId = typeof req.query.problemId === 'string' ? req.query.problemId : undefined;
      const entries = await container.attemptUseCases.listHistory(MOCK_LEARNER_ID, problemId);
      res.json(
        entries.map((e) => ({
          ...serializeAttempt({ ...e.attempt, submissions: [] }),
          latestFeedbackSummary: e.latestFeedbackSummary,
        })),
      );
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const attempt = await container.attemptUseCases.getAttempt(req.params.id);
      res.json(serializeAttempt(attempt));
    }),
  );

  router.post(
    '/:id/submissions',
    asyncHandler(async (req, res) => {
      const body = submitSolutionSchema.parse(req.body);
      const result = await container.submissionUseCases.submitAndEvaluate(req.params.id, body.format, body.content);
      res.status(201).json(result);
    }),
  );

  router.get(
    '/:id/feedback',
    asyncHandler(async (req, res) => {
      const result = await container.submissionUseCases.getFeedback(req.params.id);
      res.json(result);
    }),
  );

  return router;
}
