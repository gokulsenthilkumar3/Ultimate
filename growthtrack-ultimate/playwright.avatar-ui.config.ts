import { defineConfig } from '@playwright/test';
import physique from './playwright.physique.config';
export default defineConfig({ ...physique,testMatch:['**/avatar-presentation.spec.ts'],timeout:90_000 });
