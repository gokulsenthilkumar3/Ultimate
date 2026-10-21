import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { environment: 'node', include: ['companions/tests/**/*.test.ts'] } });
