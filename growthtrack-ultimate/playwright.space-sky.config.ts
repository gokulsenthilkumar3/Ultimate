import { defineConfig } from '@playwright/test';
import physique from './playwright.physique.config';
export default defineConfig({ ...physique, testMatch: ['**/physique-space-sky.spec.ts'], timeout: 120_000, use: { ...physique.use, actionTimeout: 15000 } });
