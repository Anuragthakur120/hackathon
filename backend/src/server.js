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

const dbInfo = await connectDatabase(mongoUri);
if (dbInfo.mode === 'mongo') {
  // Return in terminal as requested
  // ("in backend return terminal mongodb connected")
}

if (process.env.DEMO_MODE !== 'false') {
  await seedDatabase(mongoUri);
}

const app = createApp();
app.listen(PORT, () => {
  console.log(`[@nagarsathi/backend] Listening on http://localhost:${PORT}`);
});

