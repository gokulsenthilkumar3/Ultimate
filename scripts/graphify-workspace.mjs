/** Run the installed Graphify CLI; never synthesize graph nodes or edges. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { format } from 'prettier';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const graphPath = path.join(root, 'graphify-out/graph.json');
const command = process.argv[2];
if (!['build', 'update', 'wiki', 'benchmark'].includes(command)) {
  throw new Error(
    'Usage: node scripts/graphify-workspace.mjs build|update|wiki|benchmark',
  );
}
function run(args) {
  const result = spawnSync('graphify', args, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      GRAPHIFY_BACKEND: 'none',
      PYTHONUTF8: '1',
      PYTHONIOENCODING: 'utf-8',
    },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
if (command === 'build' || command === 'update') {
  run(command === 'build' ? ['extract', '.', '--code-only'] : ['update', '.']);
  run(['export', 'html']);
  run(['export', 'wiki']);
  const input = fs.readFileSync(graphPath, 'utf8');
  const formatted = await format(input, {
    parser: 'json',
    tabWidth: 2,
    endOfLine: 'lf',
  });
  assert.deepEqual(JSON.parse(input), JSON.parse(formatted));
  fs.writeFileSync(graphPath + '.tmp', formatted);
  fs.renameSync(graphPath + '.tmp', graphPath);
  console.log(
    'Graphify output: graphify-out/graph.json, graph.html and wiki/index.md. JSON formatted with Prettier; graph data unchanged.',
  );
} else {
  if (!fs.existsSync(graphPath))
    throw new Error(
      'Graphify graph is missing. Run npm run graphify:build first.',
    );
  run(
    command === 'wiki'
      ? ['export', 'wiki']
      : ['benchmark', 'graphify-out/graph.json'],
  );
}
