import { defineConfig } from '@playwright/test';
import human from './playwright.human-fidelity.config';
export default defineConfig({ ...human, testMatch: ['**/physique-skin-layers.spec.ts'] });
