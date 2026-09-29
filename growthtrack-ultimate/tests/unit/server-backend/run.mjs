import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// A parent process can clean Windows native SQLite handles after test workers exit.
const suiteDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'growthtrack-backend-suite-'));
const tests = (await fs.readdir(suiteDirectory)).filter(name => name.endsWith('.test.mjs')).sort().map(name => path.join(suiteDirectory, name));
let exitCode = 1;
try {
  exitCode = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--test', ...tests], {
      stdio: 'inherit', env: { ...process.env, GROWTHTRACK_BACKEND_TEST_ROOT: root },
    });
    child.on('error', reject);
    child.on('exit', code => resolve(code ?? 1));
  });
} finally {
  const relative = path.relative(os.tmpdir(), root);
  if (!relative.startsWith('growthtrack-backend-suite-') || relative.includes(path.sep)) throw new Error('Refusing unexpected test cleanup.');
  await fs.rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
}
process.exitCode = exitCode;
