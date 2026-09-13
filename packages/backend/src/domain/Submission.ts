/**
 * SubmissionFormat is a string union today but is treated as an open
 * extensibility point: adding 'diagram-json' or 'free-code' later means
 * adding a new literal + a new content shape + a new validator, without
 * touching Attempt, Evaluation, or the persistence layer's attempt logic.
 */
export type SubmissionFormat = 'structured-oop';

export type RelationshipType = 'inherits' | 'implements' | 'composes' | 'aggregates' | 'uses';

export interface SubmissionEntity {
  name: string;
  kind: 'class' | 'interface' | 'enum';
  responsibilities: string[];
}

export interface SubmissionRelationship {
  from: string;
  to: string;
  type: RelationshipType;
}

/**
 * The structured content of a `structured-oop` submission. This shape is the
 * MVP's answer to "what does a learner actually need to provide for an
 * attempt to be meaningful": named entities with explicit responsibilities
 * (so cohesion/coupling can be reasoned about), typed relationships (so the
 * evaluator can detect god-classes and missing collaborations), and a
 * rationale (so the learner's trade-off reasoning — not just the diagram —
 * is captured and can itself be evaluated).
 */
export interface SubmissionContent {
  entities: SubmissionEntity[];
  relationships: SubmissionRelationship[];
  rationale: string;
}

export interface Submission {
  id: string;
  attemptId: string;
  format: SubmissionFormat;
  content: SubmissionContent;
  createdAt: Date;
}

export class SubmissionValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid submission: ${issues.join('; ')}`);
    this.name = 'SubmissionValidationError';
  }
}

/**
 * Structural validation only — "is this submission well-formed enough to
 * evaluate at all". Design-quality judgments belong to the evaluators, not
 * here.
 */
export function validateSubmissionContent(content: SubmissionContent): string[] {
  const issues: string[] = [];

  if (!content.entities || content.entities.length === 0) {
    issues.push('Submission must define at least one class or interface.');
  } else {
    const seenNames = new Map<string, number>();
    for (const entity of content.entities) {
      if (!entity.name || !entity.name.trim()) {
        issues.push('Every entity must have a non-empty name.');
        continue;
      }
      const key = entity.name.trim().toLowerCase();
      seenNames.set(key, (seenNames.get(key) ?? 0) + 1);
      if (!entity.responsibilities || entity.responsibilities.filter((r) => r.trim()).length === 0) {
        issues.push(`Entity "${entity.name}" must list at least one responsibility.`);
      }
    }
    for (const [name, count] of seenNames.entries()) {
      if (count > 1) issues.push(`Duplicate entity name detected: "${name}" appears ${count} times.`);
    }
  }

  if (content.relationships) {
    const entityNames = new Set((content.entities ?? []).map((e) => e.name.trim().toLowerCase()));
    for (const rel of content.relationships) {
      if (!rel.from || !rel.to) {
        issues.push('Every relationship must specify both "from" and "to".');
        continue;
      }
      if (!entityNames.has(rel.from.trim().toLowerCase())) {
        issues.push(`Relationship references unknown entity "${rel.from}".`);
      }
      if (!entityNames.has(rel.to.trim().toLowerCase())) {
        issues.push(`Relationship references unknown entity "${rel.to}".`);
      }
    }
  }

  if (!content.rationale || content.rationale.trim().length < 10) {
    issues.push('Rationale must explain your key design decisions (at least a sentence or two).');
  }

  return issues;
}

export function createSubmission(input: {
  id?: string;
  attemptId: string;
  format: SubmissionFormat;
  content: SubmissionContent;
  createdAt?: Date;
}): Submission {
  const issues = validateSubmissionContent(input.content);
  if (issues.length > 0) throw new SubmissionValidationError(issues);
  return {
    id: input.id ?? crypto.randomUUID(),
    attemptId: input.attemptId,
    format: input.format,
    content: input.content,
    createdAt: input.createdAt ?? new Date(),
  };
}
