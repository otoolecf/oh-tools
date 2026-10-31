import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 2,
  use: { baseURL: 'http://localhost:4173', headless: true, trace: 'retain-on-failure' },
  webServer: [
    { command: 'npm run build && npm run preview', url: 'http://localhost:4173', timeout: 60_000 },
    { command: 'npm run dev:signaling', port: 3001, timeout: 30_000 },
  ],
});
