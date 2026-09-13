import { describe, it, expect } from 'vitest';
import { LLMEvaluator } from '../../src/evaluation/LLMEvaluator';
import { LLMClient } from '../../src/infra/llm/LLMClient';
import { createProblem, Problem } from '../../src/domain/Problem';
import { createSubmission, Submission, SubmissionContent } from '../../src/domain/Submission';
import { SEED_PROBLEMS } from '../../seed/problems';

function parkingLotProblem(): Problem {
  const seed = SEED_PROBLEMS.find((p) => p.slug === 'parking-lot')!;
  return createProblem({ ...seed });
}

function sampleSubmission(): Submission {
  const content: SubmissionContent = {
    entities: [
      { name: 'Vehicle', kind: 'interface', responsibilities: ['Represent a vehicle'] },
      { name: 'ParkingSpot', kind: 'class', responsibilities: ['Track occupancy'] },
    ],
    relationships: [{ from: 'ParkingSpot', to: 'Vehicle', type: 'uses' }],
    rationale: 'Vehicle is abstracted so new vehicle types can be added later.',
  };
  return createSubmission({ attemptId: 'attempt-1', format: 'structured-oop', content });
}

class StubLLMClient implements LLMClient {
  constructor(private readonly behavior: (() => Promise<string>) | (() => string)) {}
  async complete(): Promise<string> {
    return this.behavior();
  }
}

describe('LLMEvaluator', () => {
  const problem = parkingLotProblem();
  const submission = sampleSubmission();

  it('returns status "unavailable" (not an error, not a throw) when no client is configured', async () => {
    const evaluator = new LLMEvaluator(null);
    const result = await evaluator.evaluate(problem, submission);
    expect(result.status).toBe('unavailable');
    expect(result.findings).toEqual([]);
    expect(result.errorMessage).toContain('No LLM provider is configured');
  });

  it('parses a well-formed JSON response into findings and strengths', async () => {
    const client = new StubLLMClient(() =>
      JSON.stringify({
        strengths: [{ message: 'Good separation of concerns', explanation: 'Vehicle and ParkingSpot are decoupled.' }],
        findings: [
          {
            category: 'pattern-usage',
            severity: 'suggestion',
            message: 'Consider a Strategy pattern for spot allocation',
            explanation: 'Allocation policy may vary.',
            suggestion: 'Extract an AllocationStrategy interface.',
          },
        ],
      }),
    );
    const evaluator = new LLMEvaluator(client);
    const result = await evaluator.evaluate(problem, submission);

    expect(result.status).toBe('ok');
    expect(result.strengths).toHaveLength(1);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].category).toBe('pattern-usage');
  });

  it('tolerates a response wrapped in markdown code fences', async () => {
    const client = new StubLLMClient(
      () => '```json\n' + JSON.stringify({ strengths: [], findings: [] }) + '\n```',
    );
    const evaluator = new LLMEvaluator(client);
    const result = await evaluator.evaluate(problem, submission);
    expect(result.status).toBe('ok');
  });

  it('degrades to status "error" (never throws) when the client rejects', async () => {
    const client: LLMClient = {
      complete: async () => {
        throw new Error('network timeout');
      },
    };
    const evaluator = new LLMEvaluator(client);
    const result = await evaluator.evaluate(problem, submission);
    expect(result.status).toBe('error');
    expect(result.findings).toEqual([]);
    expect(result.errorMessage).toContain('temporarily unavailable');
  });

  it('degrades to status "error" when the response is not valid JSON', async () => {
    const client = new StubLLMClient(() => 'Sorry, I cannot help with that.');
    const evaluator = new LLMEvaluator(client);
    const result = await evaluator.evaluate(problem, submission);
    expect(result.status).toBe('error');
  });

  it('drops malformed individual findings (missing message/explanation) rather than failing the whole evaluation', async () => {
    const client = new StubLLMClient(() =>
      JSON.stringify({
        strengths: [{ message: 'ok', explanation: 'fine' }],
        findings: [{ category: 'design-quality', severity: 'issue' /* missing message + explanation */ }],
      }),
    );
    const evaluator = new LLMEvaluator(client);
    const result = await evaluator.evaluate(problem, submission);
    expect(result.status).toBe('ok');
    expect(result.findings).toEqual([]);
    expect(result.strengths).toHaveLength(1);
  });

  it('defaults an unrecognized category/severity to a safe value rather than rejecting the finding', async () => {
    const client = new StubLLMClient(() =>
      JSON.stringify({
        strengths: [],
        findings: [
          {
            category: 'something-unexpected',
            severity: 'critical',
            message: 'Odd category from the model',
            explanation: 'Testing sanitization.',
          },
        ],
      }),
    );
    const evaluator = new LLMEvaluator(client);
    const result = await evaluator.evaluate(problem, submission);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].category).toBe('design-quality');
    expect(result.findings[0].severity).toBe('suggestion');
  });
});
