import { defineConfig } from '@playwright/test';
import milestone from './playwright.milestone-review.config';
export default defineConfig({ ...milestone, testMatch: [
  '**/physique-model-measurements.spec.ts', '**/notes-duplicate.spec.ts',
  '**/physique-people.spec.ts', '**/notes-slice.spec.ts',
] });
