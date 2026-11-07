import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { rejectExposedDeploymentSecrets } from '../server/exposedSecrets.js';

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../deploy/secrets');
await fs.mkdir(directory, { recursive: true, mode: 0o700 });
for (const name of ['app-encryption-key', 'handoff-secret']) {
  const filename = path.join(directory, name);
  try {
    const existing = await fs.readFile(filename, 'utf8');
    if (!/^[a-f0-9]{64}\s*$/i.test(existing)) throw new Error(`Existing ${name} has an invalid format. It was preserved.`);
    rejectExposedDeploymentSecrets({ [name === 'app-encryption-key' ? 'APP_ENCRYPTION_KEY' : 'HANDOFF_SECRET']: existing });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await fs.writeFile(filename, `${randomBytes(32).toString('hex')}\n`, { flag: 'wx', mode: 0o600 });
  }
}
console.log('Deployment keys are ready in deploy/secrets. Existing keys were preserved. Keep a separate protected backup of these files.');
