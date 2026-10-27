import { defineConfig, devices } from '@playwright/test';
import foundation from './playwright.foundation.config';

export default defineConfig({
  ...foundation,
  testMatch: ['**/parametric-visual.spec.ts'],
  outputDir: '.tmp/parametric-visual-tests',
  workers: 1,
  timeout: 180_000,
  projects: [{ name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 1050 } } }],
});
