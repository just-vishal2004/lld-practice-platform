import { Problem } from '../domain/Problem';
import { Submission } from '../domain/Submission';
import { EvaluationResult, Finding, FindingCategory, FindingSeverity } from '../domain/Evaluation';
import { Evaluator } from './Evaluator';
import { LLMClient } from '../infra/llm/LLMClient';

const SYSTEM_PROMPT = `You are an experienced Low-Level Design (LLD) reviewer helping a learner improve.
There is NEVER exactly one correct design for these problems. Do not penalize the learner for
choosing a different valid abstraction than you would. Focus only on qualitative design judgment:
cohesion, coupling, appropriate use of patterns, and extensibility trade-offs. Do NOT repeat
generic requirement-coverage checks (that is handled elsewhere).

Respond with ONLY a JSON object (no prose, no markdown fences) matching exactly this shape:
{
  "strengths": [{ "message": string, "explanation": string }],
  "findings": [
    {
      "category": "design-quality" | "extensibility" | "pattern-usage",
      "severity": "info" | "suggestion" | "issue",
      "message": string,
      "explanation": string,
      "suggestion": string
    }
  ]
}
Provide 1-4 strengths and 1-5 findings. Every finding needs a concrete, actionable "suggestion".`;

const ALLOWED_CATEGORIES: FindingCategory[] = ['design-quality', 'extensibility', 'pattern-usage'];
const ALLOWED_SEVERITIES: FindingSeverity[] = ['info', 'suggestion', 'issue'];

interface RawLLMFinding {
  category?: string;
  severity?: string;
  message?: string;
  explanation?: string;
  suggestion?: string;
}
interface RawLLMStrength {
  message?: string;
  explanation?: string;
}
interface RawLLMResponse {
  strengths?: RawLLMStrength[];
  findings?: RawLLMFinding[];
}

function buildUserPrompt(problem: Problem, submission: Submission): string {
  return JSON.stringify(
    {
      problem: {
        title: problem.title,
        summary: problem.summary,
        requirements: problem.requirements,
        constraints: problem.constraints,
      },
      submission: {
        entities: submission.content.entities,
        relationships: submission.content.relationships,
        rationale: submission.content.rationale,
      },
    },
    null,
    2,
  );
}

function extractJson(raw: string): RawLLMResponse {
  // Models occasionally wrap JSON in markdown fences despite instructions; strip defensively.
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('Response did not contain a JSON object');
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as RawLLMResponse;
}

function sanitizeFindings(raw: RawLLMFinding[] | undefined): Finding[] {
  if (!Array.isArray(raw)) return [];
  const findings: Finding[] = [];
  for (const f of raw) {
    if (!f.message || !f.explanation) continue;
    const category = ALLOWED_CATEGORIES.includes(f.category as FindingCategory) ? (f.category as FindingCategory) : 'design-quality';
    const severity = ALLOWED_SEVERITIES.includes(f.severity as FindingSeverity) ? (f.severity as FindingSeverity) : 'suggestion';
    findings.push({ category, severity, message: f.message, explanation: f.explanation, suggestion: f.suggestion });
  }
  return findings;
}

function sanitizeStrengths(raw: RawLLMStrength[] | undefined): Finding[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s.message && s.explanation)
    .map((s) => ({ category: 'strength' as const, severity: 'info' as const, message: s.message!, explanation: s.explanation! }));
}

/**
 * Qualitative evaluator backed by an LLM. Designed to fail closed, never
 * open: any failure (no client configured, network error, malformed JSON
 * response) results in status 'unavailable' or 'error' with empty
 * findings — it NEVER throws out of `evaluate`, and the caller (application
 * layer) is expected to still complete the attempt using deterministic
 * results alone.
 */
export class LLMEvaluator implements Evaluator {
  readonly kind = 'llm' as const;

  constructor(private readonly client: LLMClient | null) {}

  async evaluate(problem: Problem, submission: Submission): Promise<EvaluationResult> {
    if (!this.client) {
      return {
        evaluatorKind: 'llm',
        status: 'unavailable',
        findings: [],
        strengths: [],
        errorMessage: 'No LLM provider is configured (ANTHROPIC_API_KEY not set). Showing deterministic feedback only.',
      };
    }

    try {
      const raw = await this.client.complete(SYSTEM_PROMPT, buildUserPrompt(problem, submission));
      const parsed = extractJson(raw);
      return {
        evaluatorKind: 'llm',
        status: 'ok',
        findings: sanitizeFindings(parsed.findings),
        strengths: sanitizeStrengths(parsed.strengths),
      };
    } catch (err) {
      return {
        evaluatorKind: 'llm',
        status: 'error',
        findings: [],
        strengths: [],
        errorMessage: `AI design-quality feedback is temporarily unavailable (${(err as Error).message}). Deterministic feedback below is still complete.`,
      };
    }
  }
}
