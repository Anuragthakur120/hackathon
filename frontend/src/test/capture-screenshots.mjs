/* eslint-disable no-undef */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactDir = 'C:/Users/LENOVO/.gemini/antigravity/brain/fea6be96-f34b-4e92-a18a-b61d8185e757';

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('Starting preview server...');
  const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], {
    cwd: path.resolve(__dirname, '../../frontend'),
    shell: true,
    stdio: 'pipe',
  });

  server.stdout.on('data', (d) => console.log(`[preview] ${d}`));
  server.stderr.on('data', (d) => console.error(`[preview-err] ${d}`));

  // Give server time to spin up
  await wait(3000);

  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    });

    // 1. Screenshot of /login
    console.log('Navigating to /login...');
    await page.goto('http://localhost:4173/login', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(artifactDir, 'ui2-login.png'), fullPage: true });
    console.log('Saved ui2-login.png');

    // 2. Screenshot of /signup
    console.log('Navigating to /signup...');
    await page.goto('http://localhost:4173/signup', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(artifactDir, 'ui2-signup.png'), fullPage: true });
    console.log('Saved ui2-signup.png');

    // 3. Screenshot of /app (seeded demo auth)
    console.log('Navigating to /app with demo auth session...');
    await page.evaluate(() => {
      window.localStorage.setItem(
        'nagarsathi_auth',
        JSON.stringify({
          state: {
            user: {
              id: 'CITIZEN-RAMABAI-01',
              name: 'Ramabai Kulkarni',
              phone: '9876543210',
              language: 'en-IN',
              role: 'citizen',
              aadhaarMasked: 'XXXX-XXXX-4821',
              phoneMasked: 'XXXXXX3210',
              bankAccountMasked: 'XXXXXXXX9012',
            },
            token: 'mock-jwt-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.nagarsathi-demo-token',
            registeredUsers: [
              {
                id: 'CITIZEN-RAMABAI-01',
                name: 'Ramabai Kulkarni',
                phone: '9876543210',
                language: 'en-IN',
                role: 'citizen',
              },
            ],
          },
          version: 0,
        })
      );
    });
    await page.goto('http://localhost:4173/app', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(artifactDir, 'ui3-dashboard-1280.png'), fullPage: true });
    console.log('Saved ui3-dashboard-1280.png');

    // 4. Screenshot of new Citizen Dashboard (/dashboard)
    console.log('Navigating to /dashboard...');
    await page.goto('http://localhost:4173/dashboard', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(artifactDir, 'platform-dashboard.png'), fullPage: true });
    console.log('Saved platform-dashboard.png');

    // 5. Screenshot of All Schemes (/schemes)
    console.log('Navigating to /schemes...');
    await page.goto('http://localhost:4173/schemes', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(artifactDir, 'platform-schemes.png'), fullPage: true });
    console.log('Saved platform-schemes.png');

    // 6. Screenshot of Eligibility Checker (/eligibility)
    console.log('Navigating to /eligibility...');
    await page.goto('http://localhost:4173/eligibility', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(artifactDir, 'platform-eligibility.png'), fullPage: true });
    console.log('Saved platform-eligibility.png');

    // 7. Screenshot of Document Center (/documents)
    console.log('Navigating to /documents...');
    await page.goto('http://localhost:4173/documents', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(artifactDir, 'platform-documents.png'), fullPage: true });
    console.log('Saved platform-documents.png');

    // 8. Screenshot of AI Assistant (/assistant)
    console.log('Navigating to /assistant...');
    await page.goto('http://localhost:4173/assistant', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(artifactDir, 'platform-assistant.png'), fullPage: true });
    console.log('Saved platform-assistant.png');

    // 9. Mobile 360px viewport of /dashboard
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('http://localhost:4173/dashboard', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(artifactDir, 'platform-dashboard-360.png'), fullPage: true });
    console.log('Saved platform-dashboard-360.png');

  } finally {
    await browser.close();
    server.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
