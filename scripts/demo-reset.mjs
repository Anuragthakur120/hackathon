#!/usr/bin/env node
/**
 * NagarSathi (CITY-02) — Seeded Demo Reset Command (`npm run demo:reset`)
 *
 * Resets the database (in-memory or MongoDB via MONGODB_URI) to the clean
 * seeded Ramabai Kulkarni state (Marathi mr-IN, 3 validated service catalogs,
 * encrypted Profile, 5 verified VaultDocs, DEMO_CASE_ID, masked AuditLog)
 * and optionally triggers POST /api/demo/reset on a running backend server.
 */
import { clearMemoryDatabase, seedDatabase } from '../database/src/index.js';
import { resetUnknownIntakeAttempts } from '../backend/src/routes/agentRoutes.js';
import { defaultPortalAdapter } from '../backend/src/portalAdapter.js';

async function main() {
  clearMemoryDatabase();
  resetUnknownIntakeAttempts();
  defaultPortalAdapter.reset();

  const seeded = await seedDatabase(process.env.MONGODB_URI || 'memory');

  // If a live backend server is listening on BACKEND_URL (or localhost:3001), reset it too
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  let liveServerReset = false;
  try {
    const res = await fetch(`${backendUrl}/api/demo/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'mr-IN' }),
      signal: AbortSignal.timeout(1500),
    });
    liveServerReset = res.ok;
  } catch {
    // Live backend not running in a separate process; local/DB seed completed
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        command: 'demo:reset',
        dbMode: seeded.mode,
        liveServerReset,
        citizen: {
          name: seeded.profile.fullName,
          language: seeded.user.language,
          phoneMasked: seeded.user.phoneMasked,
          aadhaarMasked: seeded.profile.aadhaarMasked,
          bankAccountMasked: seeded.profile.bankAccountMasked,
        },
        catalogs: seeded.catalogs.map((c) => c.serviceId),
        vaultDocsCount: seeded.vaultDocs.length,
        demoCaseId: seeded.demoCase.caseId,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error('[demo:reset] Failed:', err.message);
  process.exit(1);
});

