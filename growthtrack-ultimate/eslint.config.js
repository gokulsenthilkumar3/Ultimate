import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Keep lint focused on authored application code. These folders are build
  // output, local reports, generated fixtures, or bundled plugin sources and
  // should never hide real regressions in `src/`.
  globalIgnores([
    'dist', '.agents', '.build_test', 'coverage', 'logs', 'playwright-report',
    'test-results', '.tmp', '.vite', '.claude', '.windsurf',
    'prisma-generated', 'release-v2', 'release-*',
    'docs/ui-review/before-source',
    'build_uber.js', 'replace-hovers.js', 'task_opts.cjs',
  ]),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/static-components': 'warn',
    },
  },
  {
    files: ['server.js', 'server/**/*.js', 'scripts/**/*.js', 'scripts/**/*.mjs', 'desktop.js', 'logger.js', 'vite.config.js'],
    languageOptions: { globals: { ...globals.node, ...globals.es2021 } },
  },
  {
    files: ['src/**/*.test.{js,jsx}', 'src/**/__tests__/**/*.{js,jsx}', 'src/tests/**/*.{js,jsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.jest } },
  },
])
