import { defineConfig, devices } from '@playwright/test';
import foundation from './playwright.foundation.config';

export default defineConfig({
  ...foundation,
  testMatch: ['**/laptop-layout.spec.ts'],
  workers: 1,
  timeout: 180_000,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
});
