import { defineConfig, devices } from '@playwright/test';
import foundation from './playwright.foundation.config';

export default defineConfig({
  ...foundation, testMatch: ['**/agents.spec.ts'], workers: 1, timeout: 90_000,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: process.env.PLAYWRIGHT_CHANNEL || (process.env.CI ? undefined : 'chrome') } }],
});
