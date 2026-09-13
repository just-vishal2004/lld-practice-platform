# Design Note: LLD Practice Platform

## 1. MVP scope

A focused learner journey — **choose problem → design → submit → get
feedback → review history → try again** — for three seeded problems
(Parking Lot, Elevator, Vending Machine). Explicitly out of scope: auth/
multi-tenant accounts, a diagram/UML canvas editor, problem authoring UI,
and any distributed infrastructure (queues, microservices, k8s) — per the
assignment's own scope boundary. This is a modular monolith:
TypeScript end-to-end, Express + Prisma/SQLite backend, Next.js frontend.

## 2. User flow

1. **Problem list** (`/problems`) — three cards, one per seeded problem.
2. **Problem detail** (`/problems/[slug]`) — requirements, constraints, and
   this learner's attempt history for that problem, with a **Start
   attempt** / **Try again** button.
3. **Attempt workspace** (`/attempts/[id]`) — while `draft`: only the
   problem statement, requirements, constraints, and a structured editor
   (entities with kind + responsibilities, typed relationships, free-text
   rationale). The editor deliberately does **not** preview
   `ExpectedEntityHint`/`VariationPointHint` data — those are
   evaluator-internal (see §4) and showing them up front would hand the
   learner an answer key rather than something to reason through
   independently. They surface only afterward, as explained Feedback
   findings.
4. **Submit** — client-side structural validation first (fast feedback),
   then server-side validation (authoritative; the client never assumes it
   can substitute for it, since duplicate names, dangling relationship
   references etc. are core edge cases to defend against here per the
   assignment).
5. **Feedback** — two clearly separated columns: *Requirement & structure
   check* (deterministic) and *Design quality (AI)* (qualitative), each
   showing strengths as well as issues/suggestions, each finding carrying an
   explanation and, where relevant, a concrete suggestion — never a bare
   score.
6. **History** — every attempt persists; **Try Again** always starts a new
   Attempt (never edits/resubmits an old one), so history reads as a
   timeline of separate practice sessions.

## 3. Domain model

```
Problem            — requirements, constraints, ExpectedEntityHints,
                      VariationPointHints (seed data, read-only via API)
Attempt             — draft → submitted → evaluating → evaluated | failed
                      (explicit state machine; illegal transitions throw)
Submission          — entities[], relationships[], rationale (structured-oop
                      format; SubmissionFormat is an open string union)
Evaluator interface — evaluate(problem, submission): Promise<EvaluationResult>
  ├─ DeterministicEvaluator  — requirement coverage, structural smells,
  │                            extensibility checks (rule-based, no LLM)
  └─ LLMEvaluator            — cohesion/coupling/pattern/trade-off notes,
                               backed by an LLMClient interface
EvaluationService    — runs both evaluators, aggregates into Feedback
Feedback             — { deterministic, qualitative, summary }
```

Repositories (`ProblemRepository`, `AttemptRepository`,
`SubmissionRepository`, `FeedbackRepository`) are interfaces the domain and
application layers depend on; `src/infra/prisma/*` is the only code that
knows about Prisma or SQL. Prisma rows store structured content as
JSON-string columns, parsed/serialized only at the repository boundary —
the domain never sees an ORM type, and swapping SQLite for PostgreSQL later
is a one-line datasource change.

## 4. Evaluation strategy — the core design bet

**Why two evaluators behind one interface, not one merged system:** the two
questions "did you cover the requirements / avoid obvious structural
mistakes" and "is this a *good* design" need fundamentally different
techniques and have fundamentally different confidence levels. Merging them
into one undifferentiated feedback blob (what a raw LLM call would do)
hides which findings are verifiable and which are opinion. Every
`Evaluator` returns the same `EvaluationResult` shape
(`{ status, findings, strengths, errorMessage? }`), so `EvaluationService`
and everything upstream of it treats them identically regardless of how
each one actually works internally — a new evaluation approach (e.g. a
static-analysis pass, a rubric-scoring model, a peer-review queue) is a new
class implementing this interface plus one line wiring it into the
container; nothing else in the system changes.

**DeterministicEvaluator specifics:** its hint data
(`ExpectedEntityHint`/`VariationPointHint`, seeded per problem) is never
sent to the frontend before submission — `GET /api/problems/:slug` returns
only `{ id, slug, title, summary, requirements, constraints }`
(`toPublicProblemDetail` in `src/api/routes/problems.ts`). The evaluator
reads the full `Problem` (hints included) directly from
`ProblemRepository` inside `SubmissionUseCases`, never through that public
endpoint. This is deliberate: the hints exist to let the evaluator explain
*why* a finding matters after the fact, not to tell the learner what to
build beforehand — publishing them up front would turn a synonym-tolerant
coverage check into a copyable answer key.
- *Requirement coverage* uses synonym lists (`ExpectedEntityHint.synonyms`)
  per seeded problem rather than exact-name matching — "Car", "Vehicle", and
  "Automobile" all satisfy the same hint. Required hints missing → `issue`;
  optional hints missing → `suggestion`. Because coverage is synonym-based
  rather than name-based, submitting a hint's label instead of your own
  design isn't required to pass, and copying the label verbatim earns no
  special credit over any other valid synonym.
- *Structural smells*: a hard-coded but documented threshold flags
  god-classes (≥6 responsibilities on one entity); entities present but
  never referenced in any relationship (when 3+ entities exist) are flagged
  as possibly-disconnected, not wrong — a suggestion, not an issue.
- *Extensibility* is checked **only** against `VariationPointHint`s the
  problem itself defines (e.g. pricing strategy for Parking Lot, dispatch
  strategy for Elevator, payment method for Vending Machine) — never as a
  blanket "you should use more interfaces" heuristic. A variation point
  modeled as an interface with an implementer earns a strength; modeled as a
  concrete class earns a suggestion (not an issue, since it's still a valid
  design, just less future-proof); entirely absent earns a suggestion
  explaining *why* the problem calls for it.

**LLMEvaluator specifics:** takes an `LLMClient` interface (implemented by
`AnthropicLLMClient`, a thin fetch wrapper — no SDK dependency for one call
site). The system prompt explicitly instructs the model not to penalize
valid alternative designs and to focus only on cohesion/coupling/patterns/
trade-offs, since requirement coverage is already handled deterministically
and shouldn't be duplicated or contradicted by the LLM.

## 5. Extensibility — concretely, not just in principle

- **New evaluation approach:** implement `Evaluator`, pass it into
  `EvaluationService`'s constructor (in `container.ts`). No route, use case,
  or repository change needed.
- **New submission format:** add a literal to `SubmissionFormat`, a new
  content shape, and a new validator. `Attempt`/`Evaluation`/persistence are
  untouched because they're generic over `Submission.content`.
- **New LLM provider:** implement `LLMClient` (one method: `complete`).
  `LLMEvaluator`, `EvaluationService`, and everything above are unaffected.
- **New database:** change the Prisma `datasource` block
  (`provider`/`url`); repository *interfaces* in `application/ports.ts`
  never change, and the Prisma-specific mapping code is isolated to
  `src/infra/prisma/*`.

## 6. Failure handling (kept practical, not distributed)

Per the assignment's explicit guidance not to turn this into a
distributed-systems exercise: evaluation runs in-process and
synchronously today, but the `Attempt` status machine
(`submitted → evaluating → evaluated | failed`) is modeled as if it could be
asynchronous, and the frontend already polls `GET /attempts/:id/feedback`
while status is `evaluating`. This means introducing a real queue later
(e.g. moving `EvaluationService.evaluate` behind a worker) would not require
changing the state machine, the API contract, or the frontend polling logic
— only *where* the evaluation call happens.

**LLM failure specifically** is designed to fail closed, never open:
`LLMEvaluator.evaluate` never throws; a missing API key returns
`status: 'unavailable'`, a provider error/timeout returns `status: 'error'`,
and both carry a clear `errorMessage`. `EvaluationService` still returns a
complete `Feedback` object built from the deterministic result alone, and
the attempt still reaches `evaluated` — never `failed` — purely because AI
feedback was unavailable. `Attempt` only reaches `failed` if the
*deterministic* evaluator itself throws unexpectedly, which is treated as a
genuine defect worth surfacing distinctly from "AI was unavailable."

## 7. Key trade-offs (assumptions, labeled)

- **ASSUMPTION — no auth.** A single fixed `learnerId` stands in for a real
  account system (`MOCK_LEARNER_ID` in `api/constants.ts`). Justified
  because auth is explicitly not what this 2-day assignment evaluates, and
  every layer above the API already treats `learnerId` as an opaque string,
  so real auth later is a call-site change, not an architecture change.
- **ASSUMPTION — structured form, not a diagram canvas.** A visual UML
  editor would better match how learners think, but is a multi-day project
  on its own and would shift evaluation effort from LLD reasoning to canvas
  engineering. Structured entities/relationships/rationale keeps submission
  meaningful for evaluation while staying buildable in scope.
- **ASSUMPTION — "Try Again" always creates a new Attempt** (never edits an
  existing one), so attempt history reads as a clean timeline of separate
  sessions — directly requested in the assignment defaults, and it also
  simplifies the state machine (no transition back to `draft`).
- **Trade-off — god-class threshold (≥6) and orphan-entity checks are
  heuristics, not proofs.** They're deliberately conservative (only flagged
  as `issue` for the god-class case; orphan entities are only a
  `suggestion`) so a learner is never told a legitimately fine design is
  wrong because of an arbitrary number.
- **Trade-off — system fonts, not next/font/google.** Keeps the frontend
  fully offline-buildable (no external font fetch at build or runtime), at
  the cost of not matching a specific typographic brand exactly.
