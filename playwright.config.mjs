import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 2,
  use: { baseURL: 'http://localhost:4173', headless: true, trace: 'retain-on-failure' },
  webServer: [
    // Cold builds also fetch and verify the corresponding library source archives.
    { command: 'npm run build && npm run preview', url: 'http://localhost:4173', timeout: 180_000 },
    { command: 'npm run dev:signaling', port: 3001, timeout: 30_000 },
    { command: 'npx wrangler dev --config tests/fixtures/signaling/wrangler.jsonc --port 3002', url: 'http://localhost:3002', timeout: 30_000 },
  ],
});
