import fs from 'node:fs';

// Checked-in defaults keep fresh checkouts safe without a local ignore file.
// Local .codeindexignore entries only extend this list.
export const DEFAULT_EXCLUSIONS = Object.freeze([
  '.git', 'node_modules', '.next', '.venv', 'venv', '.code-index', '.codeindexignore', 'graphify-out',
  '.tmp', 'dist', 'dist-admin-demo', 'build', 'coverage', 'test-results', 'playwright-report',
  '.claude', '.windsurf', '.agents', '.codex', '.gstack', 'Claude',
  'docs/archive', 'docs/3d-plans', 'before-source', 'Dataset', 'outputs', 'mf_data',
  'notebooks', 'uploads', 'vault', 'secrets', '.aws', 'prisma-generated',
]);

export function resolveExclusions(localText = '') {
  const additions = localText.split(/\r?\n/)
    .map(line => line.trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, ''))
    .filter(line => line && !line.startsWith('#') && !line.startsWith('!'));
  return [...new Set([...DEFAULT_EXCLUSIONS, ...additions])].sort();
}

export function loadExclusions(ignorePath) {
  try { return resolveExclusions(fs.readFileSync(ignorePath, 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') return resolveExclusions();
    throw error;
  }
}
