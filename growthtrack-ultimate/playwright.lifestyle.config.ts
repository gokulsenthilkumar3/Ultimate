import { defineConfig, devices } from '@playwright/test';
import foundation from './playwright.foundation.config';
export default defineConfig({ ...foundation, testMatch: ['**/lifestyle-companion.spec.ts'], workers: 1, timeout: 45000,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }] });
