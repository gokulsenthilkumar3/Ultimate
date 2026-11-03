import foundation from './playwright.foundation.config';
import { defineConfig } from '@playwright/test';

// Vite-only, with every API intercepted by the owner-isolated browser fixture.
export default defineConfig({ ...foundation, testMatch: '**/ui-blind-spots.spec.ts', workers: 1, projects: foundation.projects?.filter(project => project.name === 'chromium').map(project => ({ ...project, use: { ...project.use, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) } })) });
