'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Attempt, AttemptStatus, Feedback, ProblemDetail, Submission, SubmissionContent } from '@/lib/types';
import { api, ApiError } from '@/lib/api';
import { SolutionEditor } from './SolutionEditor';
import { SubmissionView } from './SubmissionView';
import { FeedbackPanel } from './FeedbackPanel';
import { StatusBadge } from './StatusBadge';
import { StartAttemptButton } from './StartAttemptButton';

export function AttemptWorkspace({
  problem,
  initialAttempt,
  initialSubmission,
  initialFeedback,
}: {
  problem: ProblemDetail;
  initialAttempt: Attempt;
  initialSubmission: Submission | null;
  initialFeedback: Feedback | null;
}) {
  const [status, setStatus] = useState<AttemptStatus>(initialAttempt.status);
  const [submission, setSubmission] = useState<Submission | null>(initialSubmission);
  const [feedback, setFeedback] = useState<Feedback | null>(initialFeedback);
  const [submitting, setSubmitting] = useState(false);
  const [serverIssues, setServerIssues] = useState<string[] | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Poll while evaluation is in flight. In the current synchronous
  // implementation this resolves on the first poll, but the UI is written
  // to tolerate genuine asynchronous evaluation without changes.
  useEffect(() => {
    if (status !== 'evaluating') return;
    const interval = setInterval(async () => {
      const result = await api.getFeedback(initialAttempt.id);
      setStatus(result.status);
      if (result.feedback) setFeedback(result.feedback);
      if (result.status !== 'evaluating') clearInterval(interval);
    }, 1200);
    return () => clearInterval(interval);
  }, [status, initialAttempt.id]);

  async function handleSubmit(content: SubmissionContent) {
    setSubmitting(true);
    setServerIssues(null);
    setSubmitError(null);
    try {
      const result = await api.submitSolution(initialAttempt.id, content);
      setSubmission({ id: result.submissionId, attemptId: initialAttempt.id, format: 'structured-oop', content, createdAt: new Date().toISOString() });
      setStatus(result.status);
      if (result.feedback) setFeedback(result.feedback);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && Array.isArray(err.body.issues)) {
        setServerIssues(err.body.issues.map((i) => (typeof i === 'string' ? i : i.message || JSON.stringify(i))));
      } else if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Something went wrong submitting your solution. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="eyebrow">
        <Link href={`/problems/${problem.slug}`}>← {problem.title}</Link>
      </div>
      <div className="section-heading-row">
        <h1>Attempt</h1>
        <StatusBadge status={status} />
      </div>

      {submitError && <div className="error-banner">{submitError}</div>}

      {status === 'draft' && (
        <SolutionEditor onSubmit={handleSubmit} submitting={submitting} serverIssues={serverIssues} />
      )}

      {status === 'evaluating' && (
        <div className="panel">
          <h3>Evaluating your submission…</h3>
          <p className="history-meta">
            Deterministic checks and AI design-quality review are running. This usually takes a few seconds.
          </p>
        </div>
      )}

      {(status === 'evaluated' || status === 'failed') && submission && <SubmissionView submission={submission} />}

      {status === 'failed' && !feedback && (
        <div className="panel">
          <h3>Evaluation could not complete</h3>
          <p>
            Something went wrong while evaluating this submission. Your design was saved. You can start a new attempt
            and try again.
          </p>
        </div>
      )}

      {feedback && <FeedbackPanel feedback={feedback} />}

      {(status === 'evaluated' || status === 'failed') && (
        <div style={{ marginTop: 24 }}>
          <StartAttemptButton problemId={problem.id} label="Try again — start a new attempt" />
        </div>
      )}
    </div>
  );
}
