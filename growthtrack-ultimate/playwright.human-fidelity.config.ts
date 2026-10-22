import { defineConfig } from '@playwright/test';
import physique from './playwright.physique.config';
export default defineConfig({ ...physique, testMatch: ['**/physique-human-fidelity.spec.ts'], timeout:120000, use:{ ...physique.use, actionTimeout:15000 } });
