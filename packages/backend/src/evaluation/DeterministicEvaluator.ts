import { Problem } from '../domain/Problem';
import { Submission, SubmissionEntity } from '../domain/Submission';
import { EvaluationResult, Finding } from '../domain/Evaluation';
import { Evaluator } from './Evaluator';

const GOD_CLASS_RESPONSIBILITY_THRESHOLD = 6;

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

/** Loose, synonym-tolerant match: does any keyword appear inside the given text? */
function textContainsAny(text: string, keywords: string[]): boolean {
  const t = normalize(text);
  return keywords.some((k) => t.includes(normalize(k)));
}

function entityMatchesKeywords(entity: SubmissionEntity, keywords: string[]): boolean {
  if (textContainsAny(entity.name, keywords)) return true;
  return entity.responsibilities.some((r) => textContainsAny(r, keywords));
}

/**
 * Deterministic, rule-based evaluation. No LLM call, no randomness — same
 * submission always produces the same findings. This layer intentionally
 * does NOT judge subjective design quality (naming taste, style); it checks
 * things that are objectively either present or absent:
 *   1. Requirement coverage against the problem's ExpectedEntityHints
 *      (synonym-tolerant — never requires one canonical class name).
 *   2. Obvious structural problems (god-classes, orphaned entities).
 *   3. Missing extensibility ONLY where the problem defines a genuine
 *      variation point (never "you should use an interface" generically).
 */
export class DeterministicEvaluator implements Evaluator {
  readonly kind = 'deterministic' as const;

  async evaluate(problem: Problem, submission: Submission): Promise<EvaluationResult> {
    const findings: Finding[] = [];
    const strengths: Finding[] = [];
    const { entities, relationships } = submission.content;

    // 1. Requirement coverage
    let requiredMissingCount = 0;
    let requiredMatchedCount = 0;
    for (const hint of problem.expectedEntities) {
      const keywords = [hint.label, ...hint.synonyms];
      const matched = entities.some((e) => entityMatchesKeywords(e, keywords));
      if (matched) {
        requiredMatchedCount += hint.required ? 1 : 0;
        continue;
      }
      if (hint.required) {
        requiredMissingCount += 1;
        findings.push({
          category: 'requirement-coverage',
          severity: 'issue',
          message: `No entity appears to represent "${hint.label}".`,
          explanation: hint.rationale,
          suggestion: `Consider modeling a concept for "${hint.label}" (e.g. named ${hint.synonyms
            .slice(0, 3)
            .join(', ') || hint.label}), or explain in your rationale how another entity already covers this responsibility.`,
        });
      } else {
        findings.push({
          category: 'requirement-coverage',
          severity: 'suggestion',
          message: `Consider whether "${hint.label}" needs its own representation.`,
          explanation: hint.rationale,
        });
      }
    }
    const totalRequired = problem.expectedEntities.filter((h) => h.required).length;
    if (totalRequired > 0 && requiredMissingCount === 0) {
      strengths.push({
        category: 'strength',
        severity: 'info',
        message: 'All core required concepts for this problem are represented.',
        explanation: `Your design covers the ${totalRequired} required concept(s) this problem calls for, which means an evaluator can actually trace requirements to your model.`,
      });
    }

    // 2. Structural issues
    const referencedEntityNames = new Set<string>();
    for (const rel of relationships) {
      referencedEntityNames.add(normalize(rel.from));
      referencedEntityNames.add(normalize(rel.to));
    }

    const godClasses = entities.filter((e) => e.responsibilities.length >= GOD_CLASS_RESPONSIBILITY_THRESHOLD);
    for (const entity of godClasses) {
      findings.push({
        category: 'structural-issue',
        severity: 'issue',
        message: `"${entity.name}" lists ${entity.responsibilities.length} responsibilities, which risks becoming a god-class.`,
        explanation:
          'A class accumulating many unrelated responsibilities is harder to test, extend, and reason about (violates single-responsibility). This is a structural signal, not a style opinion.',
        suggestion: `Consider splitting "${entity.name}" into smaller collaborating entities, each owning a cohesive slice of behaviour.`,
      });
    }
    if (entities.length > 0 && godClasses.length === 0) {
      strengths.push({
        category: 'strength',
        severity: 'info',
        message: 'No entity shows signs of taking on too many responsibilities.',
        explanation: 'Responsibilities look reasonably distributed across entities, which supports maintainability.',
      });
    }

    if (entities.length > 1 && relationships.length === 0) {
      findings.push({
        category: 'structural-issue',
        severity: 'suggestion',
        message: 'No relationships are defined between your entities.',
        explanation:
          'Multiple entities with no declared relationships makes it hard to tell how they collaborate, which is central to LLD.',
        suggestion: 'Add relationships (composes/uses/implements/etc.) showing how your entities interact.',
      });
    } else if (entities.length > 2) {
      const orphaned = entities.filter((e) => !referencedEntityNames.has(normalize(e.name)));
      if (orphaned.length > 0) {
        findings.push({
          category: 'structural-issue',
          severity: 'suggestion',
          message: `${orphaned.length} entit${orphaned.length === 1 ? 'y is' : 'ies are'} not connected to anything: ${orphaned
            .map((e) => e.name)
            .join(', ')}.`,
          explanation: 'An entity with no relationships to the rest of the design may be dead weight or a missed collaboration.',
          suggestion: 'Either connect these entities to the rest of your design, or explain their role in your rationale.',
        });
      }
    }

    // 3. Extensibility — only against genuine variation points defined by the problem
    for (const vp of problem.variationPoints) {
      const candidateEntities = entities.filter((e) => entityMatchesKeywords(e, [vp.label, ...vp.extensibilitySignals]));
      const modeledAsAbstraction = candidateEntities.some(
        (e) => e.kind === 'interface' || relationships.some((r) => r.type === 'implements' && normalize(r.to) === normalize(e.name)),
      );
      if (candidateEntities.length === 0) {
        findings.push({
          category: 'extensibility',
          severity: 'suggestion',
          message: `This problem has a natural variation point around "${vp.label}" that your design doesn't address yet.`,
          explanation: vp.rationale,
          suggestion: `Consider whether "${vp.label}" should be pluggable (e.g. an interface with one or more implementations) so new behaviour doesn't require modifying existing classes.`,
        });
      } else if (!modeledAsAbstraction) {
        findings.push({
          category: 'extensibility',
          severity: 'suggestion',
          message: `"${vp.label}" is modeled as a concrete class rather than an abstraction.`,
          explanation: vp.rationale,
          suggestion: `If you expect multiple variations of "${vp.label}" over time, extracting an interface now avoids rewriting core logic later.`,
        });
      } else {
        strengths.push({
          category: 'strength',
          severity: 'info',
          message: `"${vp.label}" is modeled as a genuine extensibility point.`,
          explanation: 'This variation point is abstracted, so new behaviour can be added without modifying existing code (open/closed principle).',
        });
      }
    }

    return {
      evaluatorKind: 'deterministic',
      status: 'ok',
      findings,
      strengths,
    };
  }
}
