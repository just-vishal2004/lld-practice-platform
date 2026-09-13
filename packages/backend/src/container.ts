import { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from './infra/prisma/client';
import { PrismaProblemRepository } from './infra/prisma/PrismaProblemRepository';
import { PrismaAttemptRepository } from './infra/prisma/PrismaAttemptRepository';
import { PrismaSubmissionRepository } from './infra/prisma/PrismaSubmissionRepository';
import { PrismaFeedbackRepository } from './infra/prisma/PrismaFeedbackRepository';
import { DeterministicEvaluator } from './evaluation/DeterministicEvaluator';
import { LLMEvaluator } from './evaluation/LLMEvaluator';
import { EvaluationService } from './evaluation/EvaluationService';
import { createLLMClientFromEnv } from './infra/llm/llmClientFactory';
import { ProblemUseCases } from './application/ProblemUseCases';
import { AttemptUseCases } from './application/AttemptUseCases';
import { SubmissionUseCases } from './application/SubmissionUseCases';

/**
 * A single, explicit place where every concrete dependency is chosen and
 * wired together (manual dependency injection — no DI framework needed for
 * a project this size). Tests build their own container pointed at a test
 * database and/or a stub LLMClient rather than reaching into this one.
 */
export function buildContainer(prismaClient: PrismaClient = defaultPrisma) {
  const problemRepo = new PrismaProblemRepository(prismaClient);
  const attemptRepo = new PrismaAttemptRepository(prismaClient);
  const submissionRepo = new PrismaSubmissionRepository(prismaClient);
  const feedbackRepo = new PrismaFeedbackRepository(prismaClient);

  const llmClient = createLLMClientFromEnv();
  const evaluationService = new EvaluationService(new DeterministicEvaluator(), new LLMEvaluator(llmClient));

  const problemUseCases = new ProblemUseCases(problemRepo);
  const attemptUseCases = new AttemptUseCases(attemptRepo, problemRepo, submissionRepo, feedbackRepo);
  const submissionUseCases = new SubmissionUseCases(attemptRepo, problemRepo, submissionRepo, feedbackRepo, evaluationService);

  return {
    prisma: prismaClient,
    problemRepo,
    attemptRepo,
    submissionRepo,
    feedbackRepo,
    llmConfigured: llmClient !== null,
    problemUseCases,
    attemptUseCases,
    submissionUseCases,
  };
}

export type Container = ReturnType<typeof buildContainer>;
