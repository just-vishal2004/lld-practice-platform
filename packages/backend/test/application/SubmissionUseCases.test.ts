import { describe, it, expect } from 'vitest';
import { SubmissionUseCases } from '../../src/application/SubmissionUseCases';
import { AttemptUseCases } from '../../src/application/AttemptUseCases';
import { NotFoundError, IllegalStateError } from '../../src/application/errors';
import { EvaluationService } from '../../src/evaluation/EvaluationService';
import { Evaluator } from '../../src/evaluation/Evaluator';
import { EvaluationResult } from '../../src/domain/Evaluation';
import { createProblem, Problem } from '../../src/domain/Problem';
import { SubmissionContent } from '../../src/domain/Submission';
import { FakeAttemptRepository, FakeProblemRepository, FakeSubmissionRepository, FakeFeedbackRepository } from './fakes';

function testProblem(): Problem {
  return createProblem({
    slug: 'test-problem',
    title: 'Test Problem',
    summary: 'A minimal problem for use-case testing.',
    requirements: ['Do the thing'],
    constraints: [],
    expectedEntities: [],
    variationPoints: [],
  });
}

function validContent(): SubmissionContent {
  return {
    entities: [{ name: 'Thing', kind: 'class', responsibilities: ['Does the thing'] }],
    relationships: [],
    rationale: 'A minimal valid design for use-case orchestration testing.',
  };
}

class OkEvaluator implements Evaluator {
  constructor(public readonly kind: 'deterministic' | 'llm', private readonly result: EvaluationResult) {}
  async evaluate(): Promise<EvaluationResult> {
    return this.result;
  }
}

class ThrowingEvaluator implements Evaluator {
  readonly kind = 'deterministic' as const;
  async evaluate(): Promise<EvaluationResult> {
    throw new Error('simulated deterministic evaluator crash');
  }
}

function buildUseCases(deterministic: Evaluator) {
  const problem = testProblem();
  const problemRepo = new FakeProblemRepository([problem]);
  const attemptRepo = new FakeAttemptRepository();
  const submissionRepo = new FakeSubmissionRepository();
  const feedbackRepo = new FakeFeedbackRepository();
  const qualitative = new OkEvaluator('llm', { evaluatorKind: 'llm', status: 'unavailable', findings: [], strengths: [] });
  const evaluationService = new EvaluationService(deterministic, qualitative);

  const attemptUseCases = new AttemptUseCases(attemptRepo, problemRepo, submissionRepo, feedbackRepo);
  const submissionUseCases = new SubmissionUseCases(attemptRepo, problemRepo, submissionRepo, feedbackRepo, evaluationService);
  return { problem, attemptUseCases, submissionUseCases };
}

describe('SubmissionUseCases.submitAndEvaluate', () => {
  it('runs the happy path: draft -> evaluated, with feedback attached', async () => {
    const deterministic = new OkEvaluator('deterministic', { evaluatorKind: 'deterministic', status: 'ok', findings: [], strengths: [] });
    const { problem, attemptUseCases, submissionUseCases } = buildUseCases(deterministic);

    const attempt = await attemptUseCases.startAttempt(problem.id, 'learner-1');
    expect(attempt.status).toBe('draft');

    const result = await submissionUseCases.submitAndEvaluate(attempt.id, 'structured-oop', validContent());

    expect(result.status).toBe('evaluated');
    expect(result.feedback).toBeTruthy();
    expect(result.feedback?.deterministic.status).toBe('ok');
  });

  it('transitions the attempt to "failed" (not "evaluated") when the deterministic evaluator throws unexpectedly', async () => {
    const { problem, attemptUseCases, submissionUseCases } = buildUseCases(new ThrowingEvaluator());

    const attempt = await attemptUseCases.startAttempt(problem.id, 'learner-1');
    const result = await submissionUseCases.submitAndEvaluate(attempt.id, 'structured-oop', validContent());

    expect(result.status).toBe('failed');
    expect(result.feedback).toBeNull();

    // Persisted state should reflect "failed", not be stuck in "evaluating".
    const persisted = await attemptUseCases.getAttempt(attempt.id);
    expect(persisted.status).toBe('failed');
  });

  it('throws NotFoundError for a nonexistent attempt', async () => {
    const deterministic = new OkEvaluator('deterministic', { evaluatorKind: 'deterministic', status: 'ok', findings: [], strengths: [] });
    const { submissionUseCases } = buildUseCases(deterministic);

    await expect(submissionUseCases.submitAndEvaluate('no-such-attempt', 'structured-oop', validContent())).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('throws IllegalStateError when submitting again on an already-evaluated attempt', async () => {
    const deterministic = new OkEvaluator('deterministic', { evaluatorKind: 'deterministic', status: 'ok', findings: [], strengths: [] });
    const { problem, attemptUseCases, submissionUseCases } = buildUseCases(deterministic);

    const attempt = await attemptUseCases.startAttempt(problem.id, 'learner-1');
    await submissionUseCases.submitAndEvaluate(attempt.id, 'structured-oop', validContent());

    await expect(submissionUseCases.submitAndEvaluate(attempt.id, 'structured-oop', validContent())).rejects.toBeInstanceOf(
      IllegalStateError,
    );
  });

  it('rejects a structurally invalid submission before ever touching the evaluator', async () => {
    const deterministic = new OkEvaluator('deterministic', { evaluatorKind: 'deterministic', status: 'ok', findings: [], strengths: [] });
    const { problem, submissionUseCases, attemptUseCases } = buildUseCases(deterministic);

    const attempt = await attemptUseCases.startAttempt(problem.id, 'learner-1');
    const invalidContent: SubmissionContent = { entities: [], relationships: [], rationale: '' };

    await expect(submissionUseCases.submitAndEvaluate(attempt.id, 'structured-oop', invalidContent)).rejects.toThrow(
      'Invalid submission',
    );

    // Attempt should remain in draft since the submission never persisted.
    const persisted = await attemptUseCases.getAttempt(attempt.id);
    expect(persisted.status).toBe('draft');
  });
});

describe('AttemptUseCases', () => {
  it('startAttempt throws NotFoundError for a nonexistent problem', async () => {
    const deterministic = new OkEvaluator('deterministic', { evaluatorKind: 'deterministic', status: 'ok', findings: [], strengths: [] });
    const { attemptUseCases } = buildUseCases(deterministic);

    await expect(attemptUseCases.startAttempt('no-such-problem', 'learner-1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('"Try Again" semantics: starting a new attempt for the same problem creates a distinct attempt, both retained in history', async () => {
    const deterministic = new OkEvaluator('deterministic', { evaluatorKind: 'deterministic', status: 'ok', findings: [], strengths: [] });
    const { problem, attemptUseCases } = buildUseCases(deterministic);

    const first = await attemptUseCases.startAttempt(problem.id, 'learner-1');
    const second = await attemptUseCases.startAttempt(problem.id, 'learner-1');

    expect(first.id).not.toBe(second.id);
    const history = await attemptUseCases.listHistory('learner-1', problem.id);
    expect(history.map((h) => h.attempt.id).sort()).toEqual([first.id, second.id].sort());
  });
});
