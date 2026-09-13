import { PrismaClient, Evaluation as PrismaEvaluation } from '@prisma/client';
import { FeedbackRepository } from '../../application/ports';
import { Feedback, EvaluationResult, EvaluatorKind, EvaluationStatus, Finding, buildSummary } from '../../domain/Evaluation';

/**
 * Feedback is stored as two Evaluation rows (one per evaluator kind) rather
 * than a denormalized Feedback table, so each evaluator's raw result stays
 * independently queryable/auditable. Feedback.summary is recomputed rather
 * than stored, keeping it always consistent with the underlying findings.
 */
function toEvaluationResult(row: PrismaEvaluation): EvaluationResult {
  return {
    evaluatorKind: row.evaluatorKind as EvaluatorKind,
    status: row.status as EvaluationStatus,
    findings: JSON.parse(row.findingsJson) as Finding[],
    strengths: JSON.parse(row.strengthsJson) as Finding[],
    errorMessage: row.errorMessage ?? undefined,
  };
}

export class PrismaFeedbackRepository implements FeedbackRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(feedback: Feedback): Promise<Feedback> {
    await this.prisma.$transaction([
      this.prisma.evaluation.create({
        data: {
          submissionId: feedback.submissionId,
          evaluatorKind: feedback.deterministic.evaluatorKind,
          status: feedback.deterministic.status,
          findingsJson: JSON.stringify(feedback.deterministic.findings),
          strengthsJson: JSON.stringify(feedback.deterministic.strengths),
          errorMessage: feedback.deterministic.errorMessage ?? null,
        },
      }),
      this.prisma.evaluation.create({
        data: {
          submissionId: feedback.submissionId,
          evaluatorKind: feedback.qualitative.evaluatorKind,
          status: feedback.qualitative.status,
          findingsJson: JSON.stringify(feedback.qualitative.findings),
          strengthsJson: JSON.stringify(feedback.qualitative.strengths),
          errorMessage: feedback.qualitative.errorMessage ?? null,
        },
      }),
    ]);
    return feedback;
  }

  async findLatestBySubmissionId(submissionId: string): Promise<Feedback | null> {
    const rows = await this.prisma.evaluation.findMany({
      where: { submissionId },
      orderBy: { createdAt: 'desc' },
    });
    if (rows.length === 0) return null;

    const deterministicRow = rows.find((r: PrismaEvaluation) => r.evaluatorKind === 'deterministic');
    const llmRow = rows.find((r: PrismaEvaluation) => r.evaluatorKind === 'llm');
    if (!deterministicRow) return null;

    const deterministic = toEvaluationResult(deterministicRow);
    const qualitative = llmRow
      ? toEvaluationResult(llmRow)
      : { evaluatorKind: 'llm' as const, status: 'unavailable' as const, findings: [], strengths: [] };

    const submissionRow = await this.prisma.submission.findUnique({ where: { id: submissionId } });

    return {
      attemptId: submissionRow?.attemptId ?? '',
      submissionId,
      deterministic,
      qualitative,
      summary: buildSummary(deterministic, qualitative),
    };
  }
}
