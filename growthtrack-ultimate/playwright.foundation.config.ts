import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e', testMatch: ['**/foundation.spec.ts', '**/editorial.spec.ts', '**/editorial-routes.spec.ts'], timeout: 30_000, retries: 0, workers: 3,
  use: { baseURL: 'http://127.0.0.1:5176', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: { command: 'node scripts/e2e-preview.mjs', url: 'http://127.0.0.1:5176', reuseExistingServer: !process.env.CI, timeout: 60_000 },
});
