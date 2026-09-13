import {
  ProblemSummary,
  ProblemDetail,
  Attempt,
  AttemptHistoryEntry,
  SubmitResult,
  FeedbackResponse,
  SubmissionContent,
  ApiErrorBody,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly body: ApiErrorBody) {
    super(body.message || `Request failed with status ${status}`);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  if (!res.ok) {
    let body: ApiErrorBody;
    try {
      body = await res.json();
    } catch {
      body = { error: 'UnknownError', message: `Request failed with status ${res.status}` };
    }
    throw new ApiError(res.status, body);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listProblems: () => request<ProblemSummary[]>('/api/problems'),
  getProblem: (slug: string) => request<ProblemDetail>(`/api/problems/${slug}`),

  startAttempt: (problemId: string) =>
    request<Attempt>('/api/attempts', { method: 'POST', body: JSON.stringify({ problemId }) }),

  getAttempt: (attemptId: string) => request<Attempt>(`/api/attempts/${attemptId}`),

  listHistory: (problemId?: string) =>
    request<AttemptHistoryEntry[]>(`/api/attempts${problemId ? `?problemId=${encodeURIComponent(problemId)}` : ''}`),

  submitSolution: (attemptId: string, content: SubmissionContent) =>
    request<SubmitResult>(`/api/attempts/${attemptId}/submissions`, {
      method: 'POST',
      body: JSON.stringify({ format: 'structured-oop', content }),
    }),

  getFeedback: (attemptId: string) => request<FeedbackResponse>(`/api/attempts/${attemptId}/feedback`),
};
