/**
 * A hint used by the DeterministicEvaluator to check requirement coverage.
 * `synonyms` is deliberately part of the model: we never require a single
 * canonical class name. A submission satisfies this hint if ANY of
 * [name, ...synonyms] appears (case-insensitively, substring-tolerant) among
 * the learner's entity names or responsibilities.
 */
export interface ExpectedEntityHint {
  /** Canonical label shown in feedback, e.g. "Vehicle abstraction" */
  label: string;
  /** Acceptable names/keywords that would satisfy this concept */
  synonyms: string[];
  /** Why this concept matters for the problem (shown in feedback explanations) */
  rationale: string;
  /** If true, missing this is an "issue"; otherwise a "suggestion" */
  required: boolean;
}

/**
 * A genuine variation point the problem calls for (e.g. "pricing strategy"
 * for Parking Lot, "vending logic per product type" for Vending Machine).
 * The DeterministicEvaluator only flags "missing extensibility" against
 * these — never against a generic "you should use an interface" heuristic.
 */
export interface VariationPointHint {
  label: string;
  /** Keywords suggesting the learner modeled this as a pluggable/abstracted concept */
  extensibilitySignals: string[];
  rationale: string;
}

export interface Problem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  requirements: string[];
  constraints: string[];
  expectedEntities: ExpectedEntityHint[];
  variationPoints: VariationPointHint[];
  createdAt: Date;
}

export function createProblem(input: Omit<Problem, 'id' | 'createdAt'> & { id?: string; createdAt?: Date }): Problem {
  if (!input.slug.trim()) throw new Error('Problem slug must not be empty');
  if (!input.title.trim()) throw new Error('Problem title must not be empty');
  if (input.requirements.length === 0) throw new Error('Problem must have at least one requirement');
  return {
    id: input.id ?? crypto.randomUUID(),
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    requirements: input.requirements,
    constraints: input.constraints,
    expectedEntities: input.expectedEntities,
    variationPoints: input.variationPoints,
    createdAt: input.createdAt ?? new Date(),
  };
}
