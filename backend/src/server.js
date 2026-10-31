import { connectDatabase, seedDatabase } from '@nagarsathi/database';
import { createApp } from './app.js';

const PORT = Number(process.env.PORT || 3001);

await connectDatabase(process.env.MONGODB_URI);
if (process.env.DEMO_MODE !== 'false') {
  await seedDatabase(process.env.MONGODB_URI);
}

const app = createApp();
app.listen(PORT, () => {
  console.log(`[@nagarsathi/backend] Listening on http://localhost:${PORT}`);
});

