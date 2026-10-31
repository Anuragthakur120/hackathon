import { createMockPortalApp } from './app.js';

const PORTAL_PORT = Number(process.env.PORTAL_PORT || 4000);
const portalApp = createMockPortalApp();

portalApp.listen(PORTAL_PORT, () => {
  console.log(
    `[@nagarsathi/mock-portal] Server-rendered portal listening on http://localhost:${PORTAL_PORT}`
  );
});

