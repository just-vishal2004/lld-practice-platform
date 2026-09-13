import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setupEnv.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
    // The API integration tests (test/api/*.test.ts) each own-and-reset a
    // shared SQLite file (test.db) in their `beforeAll`. Vitest's default
    // concurrent file execution let two files' resets interleave and wipe
    // rows (with freshly regenerated UUIDs) out from under each other,
    // producing spurious 404s. These integration tests were never written
    // to tolerate concurrent execution against shared external state, so
    // file parallelism is disabled suite-wide rather than patched per file.
    fileParallelism: false,
  },
});
