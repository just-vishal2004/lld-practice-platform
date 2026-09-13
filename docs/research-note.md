# Research Note: LLD Practice Platform

## The learner problem

Low-Level Design is unusually hard to practice alone. Unlike algorithms, where a
test suite tells you if your solution is right, LLD problems (Parking Lot,
Elevator, Vending Machine) rarely have one correct answer — two reasonable
engineers can produce very different class structures and both be defensible.
This creates a specific gap for a self-practicing learner: they can *produce* a
design fairly easily, but they have no reliable way to know whether it is
*good* — whether responsibilities are well distributed, whether the design
would survive a plausible follow-up requirement, or whether they've missed an
obvious extensibility point an interviewer would expect them to raise.

Two consequences follow directly from this:

1. **Feedback, not just correctness, is the product.** A practice platform
   for LLD only has a reason to exist if its feedback is genuinely useful —
   otherwise it's just a text box.
2. **Feedback must acknowledge design pluralism.** A tool that quietly
   assumes one canonical solution (e.g. exact class names, one specific
   pattern) will actively mis-teach learners by penalizing valid alternatives.
   This shaped nearly every decision in the MVP (see Design Note).

## Existing approaches researched

- **LeetCode / HackerRank-style judges** are the closest analogue learners
  already know, but they work because algorithmic problems have checkable
  outputs. They have no equivalent for "is this class structure good," and
  their model (submit → pass/fail) doesn't transfer to LLD at all.
- **"LLD interview prep" content** (YouTube walkthroughs, GitHub repos of
  reference solutions like ashishps1/awesome-low-level-design) is
  one-directional: a learner reads *a* solution but gets no feedback on
  *their own* attempt, and repeated exposure to one reference solution
  actively encourages memorization over understanding.
- **General-purpose AI chat (ChatGPT/Claude used ad hoc)** can genuinely
  give thoughtful LLD feedback if a learner pastes their design in and asks —
  but there is no structured submission format, no persistent history across
  attempts, and no separation between "did you miss a requirement" (an
  objective, repeatable check) and "is this well-designed" (a qualitative
  judgment) — every response mixes both, inconsistently, with no memory of
  prior attempts to show whether the learner is actually improving.
- **Mock-interview / peer-review platforms** (e.g. Pramp-style tools) give
  high-quality feedback but depend on another human being available
  synchronously — the opposite of a "practice repeatedly, any time" loop.

## Key gaps this MVP targets

- **No tool separates deterministic checking from qualitative judgment.**
  Learners get either a rigid checklist (misses that many designs are valid)
  or unstructured prose feedback (misses obvious, checkable omissions
  consistently). Splitting these into two evaluator "lanes" that are visibly
  distinct in the feedback UI is the central product bet of this MVP.
- **No tool treats an attempt as part of a series.** Practice implies
  repetition; almost nothing in this space stores attempt history in a way
  that lets a learner see if they're actually improving problem to problem.
- **No tool asks for a structured-enough submission to give structural
  feedback**, while also not asking for so much structure (e.g. a full UML
  diagram editor) that it becomes its own product to learn. A middle ground —
  named entities with explicit responsibilities and typed relationships plus
  a free-text rationale — was chosen deliberately for this reason (see
  Design Note, "Submission format").

## Product direction

Build a focused, single-learner practice loop — not an LMS, not a multi-user
assessment platform — around three seeded LLD problems. A learner starts an
attempt, submits a structured design (entities + relationships + rationale),
and receives feedback split into two clearly labeled sections: a
**deterministic** check (requirement coverage using synonym-tolerant
matching, structural smells like god-classes, and extensibility checks
scoped only to variation points the problem actually calls for) and a
**qualitative, AI-assisted** check (cohesion, coupling, pattern usage,
trade-offs) that degrades gracefully — never blocking the learner — if no AI
provider is configured or the provider fails. Every attempt is retained, so
"Try Again" is explicitly a new attempt rather than an edit, making
attempt-over-attempt history a first-class part of the product rather than
an afterthought.
