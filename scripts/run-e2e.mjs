#!/usr/bin/env node
/**
 * NagarSathi (CITY-02) — Standalone End-to-End Runner (`npm run test:e2e`)
 *
 * Runs:
 *   1. Seeded demo reset (`scripts/demo-reset.mjs`)
 *   2. Backend + Database + Models + Playwright Robot E2E suite (`backend/src/test/i1.e2e.test.js`)
 *   3. Full-stack Frontend + Backend Real-API E2E suite (`frontend/src/test/b4.test.jsx`)
 *
 * Pass `HEADED=true npm run test:e2e` to watch the Playwright robot fill the mock portal visibly.
 */
import { spawnSync } from 'node:child_process';

function runStep(label, cmd, args, extraEnv = {}) {
  console.log(`\n==> [E2E] ${label}...`);
  const res = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      ...extraEnv,
    },
  });
  if (res.status !== 0) {
    console.error(`[E2E] Step failed: ${label}`);
    process.exit(res.status || 1);
  }
}

runStep('1/3 Resetting & seeding demo database', 'node', ['scripts/demo-reset.mjs']);
runStep(
  '2/3 Running 16-step Marathi E2E + Scholarship ~80% autofill + Failure paths (backend/models/database/robot)',
  'npm',
  ['run', 'test', '--workspace=@nagarsathi/backend', '--', 'src/test/i1.e2e.test.js']
);
runStep(
  '3/3 Running Frontend + Backend realApi 16-step UI journey',
  'npm',
  ['run', 'test', '--workspace=@nagarsathi/frontend', '--', 'src/test/b4.test.jsx']
);

console.log('\n[E2E] All NagarSathi End-to-End Integration suites passed!');

