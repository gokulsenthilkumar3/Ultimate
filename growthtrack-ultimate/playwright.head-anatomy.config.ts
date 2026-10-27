import { defineConfig, devices } from '@playwright/test';
import foundation from './playwright.foundation.config';

export default defineConfig({
  ...foundation,
  testMatch: ['**/physique-face-studio.spec.ts', '**/head-anatomy.spec.ts'],
  outputDir: '.tmp/head-anatomy/browser',
  workers: 1,
  timeout: 90_000,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
});
