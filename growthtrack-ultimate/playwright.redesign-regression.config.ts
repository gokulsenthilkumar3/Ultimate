import { defineConfig } from '@playwright/test';
import physique from './playwright.physique.config';

// These suites intercept all API traffic through foundation-fixture.
export default defineConfig({
  ...physique,
  testMatch: ['**/physique-people.spec.ts', '**/avatar-presentation.spec.ts', '**/parametric-avatar.spec.ts'],
  timeout: 180_000,
});
