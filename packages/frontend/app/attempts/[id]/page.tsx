import { notFound } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { AttemptWorkspace } from '@/components/AttemptWorkspace';

export const dynamic = 'force-dynamic';

export default async function AttemptPage({ params }: { params: { id: string } }) {
  let attempt;
  try {
    attempt = await api.getAttempt(params.id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const problemSummaries = await api.listProblems();
  const matchingSummary = problemSummaries.find((p) => p.id === attempt.problemId);
  if (!matchingSummary) notFound();
  const problem = await api.getProblem(matchingSummary.slug);

  const latestSubmission = attempt.submissions[attempt.submissions.length - 1] ?? null;

  let feedback = null;
  if (attempt.status !== 'draft') {
    const feedbackResult = await api.getFeedback(attempt.id).catch(() => null);
    feedback = feedbackResult?.feedback ?? null;
  }

  return (
    <AttemptWorkspace problem={problem} initialAttempt={attempt} initialSubmission={latestSubmission} initialFeedback={feedback} />
  );
}
