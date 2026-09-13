import { Router } from 'express';
import { Container } from '../../container';
import { asyncHandler } from '../errorHandler';
import { Problem } from '../../domain/Problem';

/**
 * Public, learner-facing view of a problem. Deliberately omits
 * `expectedEntities` and `variationPoints`: those are evaluator-internal
 * hints used by DeterministicEvaluator to score coverage/extensibility
 * (see src/evaluation/DeterministicEvaluator.ts). Exposing them here would
 * turn synonym lists into a de facto "answer key" the learner could copy,
 * which directly contradicts the assignment's "no single correct solution"
 * premise. The full domain Problem (with hints) is still used internally —
 * SubmissionUseCases reads it straight from ProblemRepository, not from
 * this endpoint.
 */
function toPublicProblemDetail(problem: Problem) {
  return {
    id: problem.id,
    slug: problem.slug,
    title: problem.title,
    summary: problem.summary,
    requirements: problem.requirements,
    constraints: problem.constraints,
  };
}

export function problemsRouter(container: Container): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      const problems = await container.problemUseCases.listProblems();
      res.json(
        problems.map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          summary: p.summary,
        })),
      );
    }),
  );

  router.get(
    '/:slug',
    asyncHandler(async (req, res) => {
      const problem = await container.problemUseCases.getProblemBySlug(req.params.slug);
      res.json(toPublicProblemDetail(problem));
    }),
  );

  return router;
}

