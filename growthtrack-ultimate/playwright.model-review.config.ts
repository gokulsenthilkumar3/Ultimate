import {defineConfig} from '@playwright/test';
import milestone from './playwright.milestone-review.config';
export default defineConfig({...milestone,testMatch:['**/physique-model-review.spec.ts','**/physique-face-studio.spec.ts'],timeout:180000,outputDir:'test-results-model-review'});
