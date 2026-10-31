import { loadAllCatalogs } from './validator.js';
import { ALL_MODELS, CASE_TTL_SECONDS } from './models/index.js';

const catalogs = loadAllCatalogs();
const modelNames = Object.keys(ALL_MODELS);

console.log(
  `[@nagarsathi/database] Build validation passed: ${catalogs.length} catalogs validated (${catalogs.map((c) => c.id).join(', ')}), ${modelNames.length} Mongoose models registered (${modelNames.join(', ')}), Case TTL=${CASE_TTL_SECONDS}s (30 days).`
);

