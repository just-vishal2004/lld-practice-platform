// Runs before test files import the app/container, so PrismaClient (created
// at module-load time in src/infra/prisma/client.ts) points at an isolated
// test database rather than the dev database.
//
// The actual schema in test.db is created ahead of time by the "pretest"
// npm script (`prisma db push` against this same DATABASE_URL) — see
// package.json. This file only needs to make sure the URL matches.
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('dev.db')) {
  process.env.DATABASE_URL = 'file:./test.db';
}
