import { describe, it, expect } from 'vitest';
import { EvaluationService } from '../../src/evaluation/EvaluationService';
import { Evaluator } from '../../src/evaluation/Evaluator';
import { createProblem, Problem } from '../../src/domain/Problem';
import { createSubmission, Submission, SubmissionContent } from '../../src/domain/Submission';
import { EvaluationResult } from '../../src/domain/Evaluation';
import { SEED_PROBLEMS } from '../../seed/problems';

function parkingLotProblem(): Problem {
  const seed = SEED_PROBLEMS.find((p) => p.slug === 'parking-lot')!;
  return createProblem({ ...seed });
}

function sampleSubmission(): Submission {
  const content: SubmissionContent = {
    entities: [{ name: 'Vehicle', kind: 'class', responsibilities: ['Represent a vehicle'] }],
    relationships: [],
    rationale: 'Minimal design for aggregation testing purposes.',
  };
  return createSubmission({ attemptId: 'attempt-1', format: 'structured-oop', content });
}

class OkEvaluator implements Evaluator {
  constructor(public readonly kind: 'deterministic' | 'llm', private readonly result: EvaluationResult) {}
  async evaluate(): Promise<EvaluationResult> {
    return this.result;
  }
}

class ThrowingEvaluator implements Evaluator {
  readonly kind = 'llm' as const;
  async evaluate(): Promise<EvaluationResult> {
    throw new Error('boom - unexpected evaluator crash');
  }
}

describe('EvaluationService', () => {
  const problem = parkingLotProblem();
  const submission = sampleSubmission();

  it('aggregates deterministic and qualitative results into one Feedback with a computed summary', async () => {
    const deterministic = new OkEvaluator('deterministic', {
      evaluatorKind: 'deterministic',
      status: 'ok',
      findings: [{ category: 'requirement-coverage', severity: 'issue', message: 'missing X', explanation: 'why' }],
      strengths: [],
    });
    const qualitative = new OkEvaluator('llm', {
      evaluatorKind: 'llm',
      status: 'ok',
      findings: [],
      strengths: [{ category: 'strength', severity: 'info', message: 'nice separation', explanation: 'why' }],
    });
    const service = new EvaluationService(deterministic, qualitative);
    const feedback = await service.evaluate(problem, submission);

    expect(feedback.deterministic.findings).toHaveLength(1);
    expect(feedback.qualitative.strengths).toHaveLength(1);
    expect(feedback.summary).toContain('1 requirement/structural issue');
    expect(feedback.attemptId).toBe(submission.attemptId);
    expect(feedback.submissionId).toBe(submission.id);
  });

  it('keeps deterministic findings even if the qualitative evaluator throws unexpectedly (graceful degradation at the aggregation layer too)', async () => {
    const deterministic = new OkEvaluator('deterministic', {
      evaluatorKind: 'deterministic',
      status: 'ok',
      findings: [],
      strengths: [{ category: 'strength', severity: 'info', message: 'all good', explanation: 'why' }],
    });
    const service = new EvaluationService(deterministic, new ThrowingEvaluator());
    const feedback = await service.evaluate(problem, submission);

    expect(feedback.deterministic.strengths).toHaveLength(1);
    expect(feedback.qualitative.status).toBe('error');
    expect(feedback.qualitative.errorMessage).toContain('Unexpected evaluator failure');
    expect(feedback.summary).toContain('AI design-quality feedback was unavailable');
  });
});
