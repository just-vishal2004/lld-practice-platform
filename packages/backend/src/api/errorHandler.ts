import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { NotFoundError, IllegalStateError } from '../application/errors';
import { SubmissionValidationError } from '../domain/Submission';

/**
 * Single place mapping domain/application error types to HTTP status codes,
 * so route handlers stay thin (they throw, they don't format responses for
 * failure cases). Unknown errors default to 500 and are logged server-side
 * without leaking internals to the client.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'ValidationError', message: 'Request body failed validation', issues: err.issues });
  }
  if (err instanceof SubmissionValidationError) {
    return res.status(400).json({ error: 'SubmissionValidationError', message: err.message, issues: err.issues });
  }
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: 'NotFoundError', message: err.message });
  }
  if (err instanceof IllegalStateError) {
    return res.status(409).json({ error: 'IllegalStateError', message: err.message });
  }

  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'InternalServerError', message: 'Something went wrong.' });
}

/** Wraps an async route handler so rejected promises reach errorHandler. */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
