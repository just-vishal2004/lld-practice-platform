/**
 * ASSUMPTION (labeled explicitly, see docs/design-note.md "Assumptions"):
 * the assignment scopes this as a learner practice experience, not a
 * multi-tenant product, and auth/accounts are out of scope for a 2-day MVP.
 * A single fixed learner identity keeps Attempt/history semantics fully
 * real (still scoped by learnerId end-to-end) without building login.
 * Swapping this for real auth later only means replacing how learnerId is
 * derived per-request — every other layer already treats it as an opaque id.
 */
export const MOCK_LEARNER_ID = 'learner-default';
