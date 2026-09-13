# AI Usage

This project was built in close collaboration with Claude (Anthropic), used
as an architecture partner and pair-programmer rather than a one-shot code
generator. Below are the concrete decisions where AI suggestions were
accepted, modified, or rejected, and why.

## 1. Evaluator architecture: accepted, with a stricter interface than first proposed

**Suggested:** Claude's first proposal for splitting deterministic and AI
feedback used two independent functions called from the API route directly,
with feedback assembled ad hoc in the controller.

**Accepted (modified):** Instead, a formal `Evaluator` interface
(`{ kind, evaluate(problem, submission) }`) was adopted, with both
evaluators implementing it and an `EvaluationService` aggregator sitting
between them and the application layer. This was a deliberate strengthening
of the AI's first pass, specifically to satisfy the assignment's design
question about accommodating another evaluation approach later — a
same-shape interface makes that a concrete, checkable property of the code
(see Design Note §5) rather than an aspiration.

**Why:** the stricter version is directly testable (see
`test/evaluation/EvaluationService.test.ts`, which swaps in fake evaluators)
and keeps the controller thin.

## 2. Deterministic evaluator: rejected an early "reference solution diff" approach

**Suggested:** An early idea (from the AI) was to have the deterministic
evaluator compare the learner's submission against a stored "reference"
class list per problem and flag anything not matching.

**Rejected:** This was explicitly rejected because the assignment states
there is no single correct LLD solution, and a diff-against-reference
approach would silently penalize valid alternative designs (e.g. modeling
"Vehicle" as an abstract class vs. an interface, or splitting a
responsibility differently). It would also contradict the assignment's
explicit instruction not to require an interface "merely because a reference
solution might use one."

**Accepted instead:** A synonym-tolerant hint system
(`ExpectedEntityHint.synonyms`) that checks whether *a* concept matching a
required idea exists, by name or responsibility text, regardless of exact
naming — and an extensibility check scoped only to problem-specific
`VariationPointHint`s rather than a blanket "add more interfaces" rule. This
shows up directly in `DeterministicEvaluator.ts` and is exercised in
`test/evaluation/DeterministicEvaluator.test.ts` (specifically the test
asserting Vehicle is never wrongly demanded to be an interface).

## 3. LLM failure handling: accepted, then hardened during review

**Suggested:** Claude's initial `LLMEvaluator` draft handled "no API key
configured" by returning an empty findings array with no `status` field at
all, relying on the caller to infer "unavailable" from an empty array.

**Accepted (hardened):** During review this was flagged as a gap — an
empty-but-otherwise-normal array is indistinguishable from "the AI genuinely
had nothing to add," which would be misleading in the UI. `EvaluationResult`
was given an explicit `status: 'ok' | 'unavailable' | 'error'` plus an
optional `errorMessage`, and `LLMEvaluator.evaluate` was rewritten to never
throw and always set one of these three statuses explicitly. The frontend's
`FeedbackPanel` renders `errorMessage` directly when status isn't `'ok'`, so
"AI didn't run" and "AI ran and found nothing" are now visibly different
states to the learner.

**Why:** matches the assignment's explicit requirement that missing/failed
AI evaluation must not fail the whole experience or be silently
indistinguishable from a genuinely clean result.

## 4. Sandboxed Prisma engine download: escalated rather than silently worked around

**Situation:** Mid-build, `prisma generate` failed in the sandboxed build
environment because Prisma's query-engine binary download is blocked by
network restrictions there (unrelated to the code itself).

**AI's options considered:** (a) quietly swap SQLite/Prisma for Node's
built-in `node:sqlite` so everything could be verified end-to-end inside the
sandbox, or (b) keep Prisma as specified and clearly flag that runtime
verification would need to happen on a machine with normal internet access.

**Decision:** the AI surfaced this as an explicit choice rather than picking
silently, and the human directed it to keep Prisma + SQLite exactly as
specified (option b), accepting reduced sandbox verification in exchange for
not deviating from the requested stack. This is reflected honestly in the
README's verification section rather than glossed over — the AI did not
claim tests passed when the DB-dependent ones could not be executed in that
environment (see README "What was verified" section).

**Why this matters for the assignment:** it's a concrete example of "using
AI as an accelerator while making the final engineering decisions
explicit," per the assignment's own framing of AI usage.

## 5. Frontend typography: rejected default AI-generated visual style

**Suggested:** Claude's default instinct (per its own design guidance) was
flagged as trending toward a "warm cream background + serif display +
terracotta accent" look, or a generic SaaS-card kit with rounded shadows —
both called out as common AI-generated visual defaults.

**Accepted (redirected):** Instead, a "drafting table / blueprint" visual
direction was chosen deliberately for the subject matter (an engineering
design tool): graph-paper background grid, blueprint-blue accent, hairline
borders instead of soft card shadows, and monospace only where it's
semantically justified (entity/class names), not as decoration on labels.
System font stacks were used instead of `next/font/google` specifically so
the frontend has zero external network dependency at build or runtime — a
deliberate trade-off documented in the Design Note.

**Why:** avoids a templated look and ties the visual identity to the
subject matter (LLD/engineering design) rather than a generic dashboard
aesthetic, while also removing an unnecessary external dependency.
