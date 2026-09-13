import { describe, it, expect } from 'vitest';
import { DeterministicEvaluator } from '../../src/evaluation/DeterministicEvaluator';
import { createProblem, Problem } from '../../src/domain/Problem';
import { createSubmission, Submission, SubmissionContent } from '../../src/domain/Submission';
import { SEED_PROBLEMS } from '../../seed/problems';

function parkingLotProblem(): Problem {
  const seed = SEED_PROBLEMS.find((p) => p.slug === 'parking-lot')!;
  return createProblem({ ...seed });
}

function submissionWith(problem: Problem, content: SubmissionContent): Submission {
  return createSubmission({ attemptId: 'attempt-1', format: 'structured-oop', content });
}

describe('DeterministicEvaluator - requirement coverage', () => {
  const evaluator = new DeterministicEvaluator();
  const problem = parkingLotProblem();

  it('reports no missing-requirement issues when all required concepts are present (using synonyms, not exact names)', async () => {
    const content: SubmissionContent = {
      entities: [
        { name: 'Car', kind: 'class', responsibilities: ['Represent a vehicle wanting to park'] },
        { name: 'Space', kind: 'class', responsibilities: ['Hold occupancy state', 'Track size'] },
        { name: 'Floor', kind: 'class', responsibilities: ['Group spaces on one level'] },
        { name: 'Garage', kind: 'class', responsibilities: ['Coordinate parking across floors'] },
      ],
      relationships: [
        { from: 'Garage', to: 'Floor', type: 'composes' },
        { from: 'Floor', to: 'Space', type: 'composes' },
        { from: 'Space', to: 'Car', type: 'uses' },
      ],
      rationale: 'Garage owns floors, floors own spaces; Car is a separate concept matched against space size.',
    };
    const submission = submissionWith(problem, content);
    const result = await evaluator.evaluate(problem, submission);

    const requirementIssues = result.findings.filter((f) => f.category === 'requirement-coverage' && f.severity === 'issue');
    expect(requirementIssues).toHaveLength(0);
    expect(result.strengths.some((s) => s.message.includes('required concepts'))).toBe(true);
  });

  it('flags missing required entities as issues with an explanation', async () => {
    const content: SubmissionContent = {
      entities: [{ name: 'Thing', kind: 'class', responsibilities: ['Does stuff'] }],
      relationships: [],
      rationale: 'A minimal placeholder design for testing purposes only.',
    };
    const submission = submissionWith(problem, content);
    const result = await evaluator.evaluate(problem, submission);

    const requirementIssues = result.findings.filter((f) => f.category === 'requirement-coverage' && f.severity === 'issue');
    expect(requirementIssues.length).toBeGreaterThan(0);
    for (const issue of requirementIssues) {
      expect(issue.explanation.length).toBeGreaterThan(0);
    }
  });
});

describe('DeterministicEvaluator - structural issues', () => {
  const evaluator = new DeterministicEvaluator();
  const problem = parkingLotProblem();

  it('flags a god-class with too many responsibilities', async () => {
    const content: SubmissionContent = {
      entities: [
        {
          name: 'ParkingLot',
          kind: 'class',
          responsibilities: ['Manage floors', 'Manage spots', 'Calculate fees', 'Handle payment', 'Print tickets', 'Send notifications', 'Log analytics'],
        },
        { name: 'Vehicle', kind: 'class', responsibilities: ['Represent a vehicle'] },
      ],
      relationships: [{ from: 'ParkingLot', to: 'Vehicle', type: 'uses' }],
      rationale: 'Everything lives in one orchestrator class for simplicity.',
    };
    const submission = submissionWith(problem, content);
    const result = await evaluator.evaluate(problem, submission);

    const godClassFindings = result.findings.filter((f) => f.category === 'structural-issue' && f.message.includes('god-class'));
    expect(godClassFindings).toHaveLength(1);
    expect(godClassFindings[0].severity).toBe('issue');
  });

  it('flags entities that are not connected to anything when there are 3+ entities', async () => {
    const content: SubmissionContent = {
      entities: [
        { name: 'Garage', kind: 'class', responsibilities: ['Coordinates parking'] },
        { name: 'Spot', kind: 'class', responsibilities: ['Holds a vehicle'] },
        { name: 'UnusedHelper', kind: 'class', responsibilities: ['Does nothing connected'] },
      ],
      relationships: [{ from: 'Garage', to: 'Spot', type: 'composes' }],
      rationale: 'UnusedHelper is left over from an earlier draft and intentionally unused for this test.',
    };
    const submission = submissionWith(problem, content);
    const result = await evaluator.evaluate(problem, submission);

    const orphanFindings = result.findings.filter((f) => f.message.includes('not connected'));
    expect(orphanFindings).toHaveLength(1);
    expect(orphanFindings[0].message).toContain('UnusedHelper');
  });
});

describe('DeterministicEvaluator - extensibility (genuine variation points only)', () => {
  const evaluator = new DeterministicEvaluator();
  const problem = parkingLotProblem();

  it('rewards modeling the pricing variation point as an abstraction', async () => {
    const content: SubmissionContent = {
      entities: [
        { name: 'PricingStrategy', kind: 'interface', responsibilities: ['Calculate fee for a parking session'] },
        { name: 'HourlyPricingStrategy', kind: 'class', responsibilities: ['Implement hourly pricing rule'] },
        { name: 'ParkingLot', kind: 'class', responsibilities: ['Coordinate parking'] },
      ],
      relationships: [{ from: 'HourlyPricingStrategy', to: 'PricingStrategy', type: 'implements' }],
      rationale: 'Pricing is abstracted behind an interface so new pricing rules can be added without touching ParkingLot.',
    };
    const submission = submissionWith(problem, content);
    const result = await evaluator.evaluate(problem, submission);

    const pricingStrength = result.strengths.find((s) => s.message.includes('Pricing strategy'));
    expect(pricingStrength).toBeDefined();
  });

  it('suggests abstracting pricing when it is a concrete class with no implements relationship', async () => {
    const content: SubmissionContent = {
      entities: [
        { name: 'PricingCalculator', kind: 'class', responsibilities: ['Calculate parking fee'] },
        { name: 'ParkingLot', kind: 'class', responsibilities: ['Coordinate parking'] },
      ],
      relationships: [{ from: 'ParkingLot', to: 'PricingCalculator', type: 'uses' }],
      rationale: 'A single concrete pricing calculator handles fee math for now.',
    };
    const submission = submissionWith(problem, content);
    const result = await evaluator.evaluate(problem, submission);

    const pricingSuggestion = result.findings.find(
      (f) => f.category === 'extensibility' && f.message.toLowerCase().includes('pricing') && f.message.includes('concrete class'),
    );
    expect(pricingSuggestion).toBeDefined();
    expect(pricingSuggestion?.severity).toBe('suggestion');
  });

  it('never demands an interface for concepts that are not genuine variation points', async () => {
    const content: SubmissionContent = {
      entities: [
        { name: 'Vehicle', kind: 'class', responsibilities: ['Represents a parked vehicle'] },
        { name: 'ParkingSpot', kind: 'class', responsibilities: ['Tracks occupancy'] },
      ],
      relationships: [{ from: 'ParkingSpot', to: 'Vehicle', type: 'uses' }],
      rationale: 'Vehicle does not need to be an interface for this MVP since there is no varying vehicle behaviour required by the problem.',
    };
    const submission = submissionWith(problem, content);
    const result = await evaluator.evaluate(problem, submission);

    // Should not contain any finding demanding Vehicle be an interface -
    // "Vehicle" is a required-entity check, not a variation point in the seed data.
    const wronglyDemanded = result.findings.find(
      (f) => f.category === 'extensibility' && f.message.toLowerCase().includes('vehicle'),
    );
    expect(wronglyDemanded).toBeUndefined();
  });
});
