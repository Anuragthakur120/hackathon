import { seedDatabase } from './seed.js';
import { disconnectDatabase } from './models/index.js';

const result = await seedDatabase(process.env.MONGODB_URI);
console.log(
  `[@nagarsathi/database] Seed complete (mode=${result.mode}). Collections: ${result.collections.join(', ')}`
);
await disconnectDatabase();

