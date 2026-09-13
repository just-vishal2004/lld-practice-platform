import { describe, it, expect } from 'vitest';
import { createSubmission, validateSubmissionContent, SubmissionValidationError, SubmissionContent } from '../../src/domain/Submission';

function validContent(): SubmissionContent {
  return {
    entities: [
      { name: 'Vehicle', kind: 'interface', responsibilities: ['Represent a vehicle needing a spot'] },
      { name: 'ParkingSpot', kind: 'class', responsibilities: ['Track occupancy', 'Track size'] },
    ],
    relationships: [{ from: 'ParkingSpot', to: 'Vehicle', type: 'uses' }],
    rationale: 'Vehicle is an interface so different vehicle types can be added without changing ParkingSpot.',
  };
}

describe('Submission validation', () => {
  it('accepts a well-formed submission', () => {
    const submission = createSubmission({ attemptId: 'a1', format: 'structured-oop', content: validContent() });
    expect(submission.id).toBeTruthy();
    expect(submission.content.entities).toHaveLength(2);
  });

  it('rejects a submission with no entities', () => {
    const content = validContent();
    content.entities = [];
    const issues = validateSubmissionContent(content);
    expect(issues.some((i) => i.includes('at least one class or interface'))).toBe(true);
  });

  it('rejects an entity with no responsibilities', () => {
    const content = validContent();
    content.entities[0].responsibilities = [];
    const issues = validateSubmissionContent(content);
    expect(issues.some((i) => i.includes('must list at least one responsibility'))).toBe(true);
  });

  it('rejects duplicate entity names', () => {
    const content = validContent();
    content.entities.push({ name: 'Vehicle', kind: 'class', responsibilities: ['Duplicate'] });
    const issues = validateSubmissionContent(content);
    expect(issues.some((i) => i.toLowerCase().includes('duplicate entity name'))).toBe(true);
  });

  it('rejects relationships referencing unknown entities', () => {
    const content = validContent();
    content.relationships.push({ from: 'ParkingSpot', to: 'GhostEntity', type: 'uses' });
    const issues = validateSubmissionContent(content);
    expect(issues.some((i) => i.includes('unknown entity "GhostEntity"'))).toBe(true);
  });

  it('rejects a missing/too-short rationale', () => {
    const content = validContent();
    content.rationale = 'ok';
    const issues = validateSubmissionContent(content);
    expect(issues.some((i) => i.includes('Rationale must explain'))).toBe(true);
  });

  it('throws SubmissionValidationError with all issues attached when creating an invalid submission', () => {
    const content = validContent();
    content.entities = [];
    content.rationale = '';
    try {
      createSubmission({ attemptId: 'a1', format: 'structured-oop', content });
      expect.unreachable('createSubmission should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SubmissionValidationError);
      expect((err as SubmissionValidationError).issues.length).toBeGreaterThanOrEqual(2);
    }
  });
});
