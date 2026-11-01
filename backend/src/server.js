import fs from 'node:fs';
import path from 'node:path';
import { connectDatabase, seedDatabase } from '@nagarsathi/database';
import { createApp } from './app.js';

// Auto-load .env from current directory, backend/.env, or root .env
for (const envPath of [
  path.resolve('.env'),
  path.resolve('backend/.env'),
  path.resolve('../.env'),
]) {
  if (fs.existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath);
    } catch {
      /* ignore */
    }
  }
}

const mongoUri = process.env.MONGO_URL || process.env.MONGODB_URI;
const PORT = Number(process.env.PORT || 5000);

let dbPromise = null;
export async function initializeDatabase() {
  if (!dbPromise) {
    dbPromise = connectDatabase(mongoUri).then(async (dbInfo) => {
      if (process.env.DEMO_MODE !== 'false') {
        try {
          await seedDatabase(mongoUri);
        } catch (e) {
          console.warn('[Seed] Warning:', e?.message);
        }
      }
      return dbInfo;
    });
  }
  return dbPromise;
}

// Connect immediately on startup
await initializeDatabase().catch((err) => {
  console.warn('[Database] Initial connection notice:', err?.message);
});

const app = createApp();

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`[@nagarsathi/backend] Listening on http://localhost:${PORT}`);
  });
}

export default app;

