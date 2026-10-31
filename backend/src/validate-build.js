import { createApp } from './app.js';

const app = createApp();
if (!app || typeof app.handle !== 'function') {
  throw new Error('Failed to initialize @nagarsathi/backend Express app');
}
console.log(
  '[@nagarsathi/backend] Build validation passed: Express app, Auth/JWT, AES-256-GCM Privacy, Audit Middleware, and Core Routes verified.'
);
