import { describe, it, expect } from 'vitest';
import { createAttempt, transitionAttempt, canTransition, IllegalAttemptTransitionError } from '../../src/domain/Attempt';

describe('Attempt state machine', () => {
  it('starts in draft status', () => {
    const attempt = createAttempt({ problemId: 'p1', learnerId: 'l1' });
    expect(attempt.status).toBe('draft');
    expect(attempt.submissions).toEqual([]);
  });

  it('allows the documented forward transitions', () => {
    let attempt = createAttempt({ problemId: 'p1', learnerId: 'l1' });
    attempt = transitionAttempt(attempt, 'submitted');
    expect(attempt.status).toBe('submitted');
    attempt = transitionAttempt(attempt, 'evaluating');
    expect(attempt.status).toBe('evaluating');
    attempt = transitionAttempt(attempt, 'evaluated');
    expect(attempt.status).toBe('evaluated');
  });

  it('allows evaluating -> failed', () => {
    let attempt = createAttempt({ problemId: 'p1', learnerId: 'l1' });
    attempt = transitionAttempt(attempt, 'submitted');
    attempt = transitionAttempt(attempt, 'evaluating');
    attempt = transitionAttempt(attempt, 'failed');
    expect(attempt.status).toBe('failed');
  });

  it('allows retrying evaluation after a failure (failed -> evaluating)', () => {
    expect(canTransition('failed', 'evaluating')).toBe(true);
  });

  it('rejects illegal transitions, e.g. draft -> evaluated directly', () => {
    const attempt = createAttempt({ problemId: 'p1', learnerId: 'l1' });
    expect(() => transitionAttempt(attempt, 'evaluated')).toThrow(IllegalAttemptTransitionError);
  });

  it('rejects transitioning out of a terminal evaluated state', () => {
    let attempt = createAttempt({ problemId: 'p1', learnerId: 'l1' });
    attempt = transitionAttempt(attempt, 'submitted');
    attempt = transitionAttempt(attempt, 'evaluating');
    attempt = transitionAttempt(attempt, 'evaluated');
    expect(() => transitionAttempt(attempt, 'evaluating')).toThrow(IllegalAttemptTransitionError);
  });

  it('never allows transitioning back to draft (Try Again creates a new Attempt instead)', () => {
    expect(canTransition('submitted', 'draft')).toBe(false);
    expect(canTransition('evaluated', 'draft')).toBe(false);
    expect(canTransition('failed', 'draft')).toBe(false);
  });
});
