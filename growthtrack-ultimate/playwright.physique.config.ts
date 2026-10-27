import { defineConfig, devices } from '@playwright/test';
import foundation from './playwright.foundation.config';

export default defineConfig({
  ...foundation,
  testMatch: ['**/physique-ui.spec.ts', '**/private-anatomy.spec.ts', '**/human-asset-family.spec.ts', '**/native-anatomy-review.spec.ts'],
  workers: 1,
  timeout: 60_000,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
});
