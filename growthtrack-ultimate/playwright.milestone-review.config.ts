import {defineConfig} from '@playwright/test';
import human from './playwright.human-fidelity.config';
import { randomUUID } from 'node:crypto';
const baseURL = `http://127.0.0.1:${process.env.GROWTHTRACK_SMOKE_PORT || 5177}`;
process.env.GROWTHTRACK_SMOKE_TOKEN ||= randomUUID();
export default defineConfig({...human,
use: { ...human.use, baseURL },
globalTeardown: './scripts/e2e-milestone-teardown.mjs',
webServer: { command: 'node scripts/e2e-milestone-smoke.mjs', url: baseURL, reuseExistingServer: false, timeout: 60000 },
testMatch:[
  '**/physique-measurement-entry.spec.ts',
  '**/physique-space-sky.spec.ts',
  '**/physique-human-fidelity.spec.ts',
  '**/physique-skin-layers.spec.ts',
  '**/physique-appearance-detail.spec.ts',
  '**/physique-eye-appearance.spec.ts',
  '**/physique-viewer-tools.spec.ts',
  '**/physique-human-75.spec.ts',
  '**/physique-face-studio.spec.ts',
  '**/physique-people.spec.ts',
]});
