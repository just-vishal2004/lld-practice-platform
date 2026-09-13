# LLD Practice Platform

A focused practice tool for Low-Level Design: pick a problem (Parking Lot,
Elevator, Vending Machine), design a solution as structured
classes/interfaces/relationships plus a rationale, submit it, and get
feedback split into a deterministic requirement/structure check and an
optional AI-assisted design-quality review — then track attempts over time
and try again.

Built for the CipherSchools 2-day LLD Practice Platform assignment. See
`docs/research-note.md` and `docs/design-note.md` for the reasoning behind
the product and architecture, and `AI_USAGE.md` for how AI was used while
building it.

## Stack

- **Backend:** TypeScript, Express, Prisma ORM, SQLite (dev default),
  Zod validation, Vitest + Supertest.
- **Frontend:** Next.js (App Router), TypeScript, no external UI framework
  (hand-styled, system fonts only — no external font fetch).
- **Architecture:** modular monolith with a framework-independent domain
  layer (`packages/backend/src/domain`), an `Evaluator` interface
  separating deterministic and AI-assisted feedback
  (`packages/backend/src/evaluation`), and database-agnostic repository
  interfaces (`packages/backend/src/application/ports.ts`) implemented
  against Prisma (`packages/backend/src/infra/prisma`).

## Important: what was and wasn't verified in the build environment

This project was built in a sandboxed environment whose network allowlist
does not include `binaries.prisma.sh`, which Prisma's CLI needs to download
its query-engine binary. This is an environment limitation, not a code
issue, but it means the following is true right now, honestly:

- ✅ **Verified in-sandbox — frontend:** `tsc --noEmit` passes with zero
  errors and `next build` completes successfully end-to-end (all 6 routes
  compile and prerender).
- ✅ **Verified in-sandbox — backend, Prisma-independent parts only:**
  **37/37 backend unit tests actually pass**
  (`test/domain/*`, `test/evaluation/*`, `test/application/*` — the domain
  model, the state machine, the deterministic evaluator, the LLM
  evaluator's graceful degradation, the aggregation service, and the
  `SubmissionUseCases`/`AttemptUseCases` orchestration logic — including the
  attempt-reaches-"failed" pathway and the "Try Again creates a distinct
  attempt" behavior — using in-memory fake repositories, no database
  involved). Running `tsc --noEmit` on the backend produces **exactly four
  errors, all of the same kind**: `Module "@prisma/client" has no exported
  member 'X'`, in the four files under `src/infra/prisma/` that import
  Prisma model types. This is expected and unavoidable in this environment —
  those types only exist after `prisma generate` runs, which requires
  downloading a binary this sandbox cannot reach — but it is not a clean
  backend compile, and this README does not claim it is. Backend `npm run
  build` was **not** run, since it would fail for the same reason.
- ❌ **Not verified in-sandbox:** anything requiring a running Prisma
  Client — the 2 integration test files (`test/api/*`, ~11 tests), seeding,
  and actually booting the backend server. `npx prisma generate` fails in
  this sandbox with a checksum-fetch error against `binaries.prisma.sh`.
  This will not happen on a normal machine with internet access — it's
  purely a sandbox networking restriction — but it means those specific
  paths have not been executed by the AI, only written and statically
  reviewed (imports checked, route wiring traced by hand, Prisma schema
  cross-checked against every repository's field usage).

**You should run the verification checklist below yourself before
submitting**, particularly steps 3–7.

## Prerequisites

- Node.js 18+ (built and tested against Node 22)
- npm 10+

No Docker, no external database server — SQLite is a file on disk.

## 1. Install dependencies

```bash
git clone <this-repo-url> lld-practice-platform
cd lld-practice-platform
npm install
```

This installs both `packages/backend` and `packages/frontend` via npm
workspaces from the root.

## 2. Configure environment

```bash
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.local.example packages/frontend/.env.local
```

`packages/backend/.env` defaults to SQLite with zero further setup:

```
DATABASE_URL="file:./dev.db"
PORT=4000
ANTHROPIC_API_KEY=        # optional — see below
ANTHROPIC_MODEL=claude-sonnet-4-6
```

**AI-assisted feedback is optional.** If `ANTHROPIC_API_KEY` is left blank,
the app runs completely normally — the "Design quality (AI)" feedback
column will show "AI feedback unavailable" and the deterministic column
still works fully. Set a real key to enable it.

`packages/frontend/.env.local` just needs to point at the backend:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## 3. Generate the Prisma client

```bash
cd packages/backend
npx prisma generate
```

This downloads Prisma's query-engine binary on first run — requires normal
internet access (this is the step that cannot run in the sandbox this
project was built in; it should work without issue on your machine).

## 4. Set up the database (migration)

```bash
npx prisma migrate dev --name init
```

This creates `packages/backend/dev.db` with the schema in
`prisma/schema.prisma`.

## 5. Seed the three problems

```bash
npm run seed
```

Seeds Parking Lot, Elevator, and Vending Machine (idempotent — safe to
re-run; it upserts by slug).

## 6. Run backend tests

```bash
npm test
```

This runs `pretest` first (`prisma db push` against an isolated
`test.db`, separate from your dev database), then the full Vitest suite —
domain, evaluation, application, and API integration tests (49 tests across
8 files). Expect all test files to pass once step 3 has succeeded on your
machine.

**Note on test isolation:** the two API integration files
(`test/api/problems.test.ts`, `test/api/attempts.test.ts`) each reset and
reseed the same shared `test.db` in their own `beforeAll`. Vitest runs test
files concurrently by default, which let those two files' resets interleave
and intermittently wipe rows out from under each other. `vitest.config.ts`
now sets `fileParallelism: false` so integration test files never overlap,
and `test/api/testDb.ts`'s seeding uses `upsert` by slug (matching
`seed/seed.ts`'s existing pattern) instead of delete+recreate, so problem
IDs stay stable across resets. This was traced and fixed in the backend
test infrastructure only — no application/production code changed as a
result, since the route → use case → repository → Prisma → response chain
was confirmed correct throughout.

## 7. Start the backend and frontend

In one terminal:

```bash
cd packages/backend
npm run dev
# LLD Practice Platform backend listening on http://localhost:4000
```

In another terminal:

```bash
cd packages/frontend
npm run dev
# ready on http://localhost:3000
```

## 8. Manually verify the full learner journey

1. Open `http://localhost:3000` → redirects to `/problems`, shows 3 cards.
2. Open **Parking Lot** → see requirements/constraints → **Start attempt**.
3. In the editor: add a couple of entities (e.g. `Vehicle`, `ParkingSpot`,
   `ParkingLot`), give each at least one responsibility, add a relationship,
   write a rationale, then **Submit for feedback**.
4. Confirm the feedback screen shows two columns — deterministic
   requirement/structure findings and an AI column (either real findings if
   you set an API key, or a clear "unavailable" note if you didn't) — with
   strengths as well as issues/suggestions, each with an explanation.
5. Go back to the problem page → your attempt appears in **Your attempts**
   with a status badge and feedback summary.
6. Click **Try again** → confirm a *new* attempt is created (separate from
   the first) and the old one is still visible in history.
7. Try an edge case: submit with an empty entity list, or two entities
   named the same thing → confirm a clear validation error appears without
   crashing anything.
8. Visit `/history` → confirm attempts across all problems show up.

## 9. Production build check

```bash
# frontend
cd packages/frontend
npm run build   # verified in-sandbox: succeeds

# backend
cd packages/backend
npm run build   # requires the Prisma client to already be generated (step 3)
```

---

## Final verification checklist (run in this order)

1. `npm install` (root)
2. Configure `.env` / `.env.local` (copy from `.example` files)
3. `npx prisma generate` (packages/backend)
4. `npx prisma migrate dev --name init` (packages/backend)
5. `npm run seed` (packages/backend)
6. `npm test` (packages/backend) — expect all suites green
7. Start backend (`npm run dev`) and frontend (`npm run dev`) in parallel
8. Manually walk the full learner journey (section 8 above)
9. `npm run build` in both packages (production build check)

## Highest-risk areas to manually inspect

These are the places most likely to surface an issue on a real machine,
since they involve either the parts that couldn't be executed in the build
sandbox, or genuinely subtle logic:

1. **Prisma schema ↔ repository field mapping.** Every repository in
   `src/infra/prisma/*` parses JSON-string columns by hand
   (`JSON.parse(row.requirementsJson)`, etc.). If a column is ever renamed
   in `schema.prisma` without updating the matching repository, this fails
   at runtime, not at compile time (Prisma's generated types will be
   correct, but the JSON contract inside the string is not itself
   type-checked end-to-end). Worth a deliberate look after `prisma
   generate` actually runs.
2. **The `Attempt` state machine's interaction with concurrent requests.**
   `SubmissionUseCases.submitAndEvaluate` reads the attempt, then updates
   it twice (`submitted` → `evaluating`, then → `evaluated`/`failed`) with
   no optimistic locking. Two near-simultaneous submissions to the same
   attempt could theoretically race. Low risk for a single-learner MVP, but
   worth knowing if you extend this.
3. **`DeterministicEvaluator`'s synonym matching is substring-based**
   (`text.includes(keyword)`), which is deliberately permissive (see Design
   Note) but can also over-match — e.g. a responsibility mentioning "cost"
   in passing could satisfy a "pricing" variation-point check even if
   pricing isn't really modeled. Worth trying a few adversarial submissions
   by hand.
4. **`LLMEvaluator`'s JSON extraction** (`extractJson`) takes the first `{`
   to the last `}` in the response. This is intentionally lenient (models
   sometimes wrap JSON in prose or fences) but could misparse if a model
   ever returns multiple JSON-like blocks. Worth testing with a real
   `ANTHROPIC_API_KEY` to see actual model output, not just the mocked
   responses used in `test/evaluation/LLMEvaluator.test.ts`.
5. **Frontend `attempts/[id]/page.tsx`'s problem lookup** goes through
   `listProblems()` → find by id → `getProblem(slug)` (two round trips)
   because the API only exposes problems by slug. Fine at 3 problems; would
   need a `GET /api/problems/by-id/:id`-style route if the problem set grows
   much larger.
6. **`test/setupEnv.ts`'s DATABASE_URL guard** — it only overrides
   `DATABASE_URL` to `file:./test.db` if the existing value is unset or
   contains `dev.db`. If you customize `DATABASE_URL` to something that
   doesn't contain `dev.db`, tests could unintentionally run against your
   real dev database. Double-check this before running `npm test` if you've
   changed the default `.env`.

## Repository layout

```
lld-practice-platform/
├── package.json                 # npm workspaces root
├── docs/
│   ├── research-note.md
│   └── design-note.md
├── AI_USAGE.md
├── README.md                    # this file
└── packages/
    ├── backend/
    │   ├── prisma/schema.prisma
    │   ├── seed/                # seed data + script for the 3 problems
    │   ├── src/
    │   │   ├── domain/          # Problem, Attempt, Submission, Evaluation
    │   │   ├── evaluation/      # Evaluator interface + both implementations
    │   │   ├── application/    # use cases + repository ports
    │   │   ├── infra/          # Prisma repositories, LLM client
    │   │   ├── api/            # Express routes, schemas, error handling
    │   │   ├── container.ts    # composition root
    │   │   └── server.ts
    │   └── test/                # domain, evaluation, application, and API integration tests
    └── frontend/
        ├── app/                 # Next.js App Router pages
        ├── components/          # editor, feedback panel, workspace, etc.
        └── lib/                 # API client + shared types
```

## Files to include in your final submission

- The entire repository (all source under `packages/`, `docs/`,
  `AI_USAGE.md`, this `README.md`).
- **Do not** include `node_modules/`, `.next/`, `dist/`, or `*.db` files —
  see `.gitignore`; these are all regenerated by the setup steps above.
