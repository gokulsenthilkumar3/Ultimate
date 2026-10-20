import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDeploymentSecrets } from '../server/deploymentSecrets.js';
import { localDatabaseFile } from '../server/domains/sqliteBackup.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadDeploymentSecrets();
const [action = 'serve', ...args] = process.argv.slice(2);
const commands = { init: './init-database.mjs', owner: './create-owner.js', backup: './backup-db.mjs', 'migrate-notes': './migrate-notes.mjs' };
if (action !== 'migrate-notes' && args.length) throw new Error('Unexpected deployment command arguments.');
if (action === 'serve') {
  const database = localDatabaseFile(root);
  const stat = await fs.stat(database).catch(() => null);
  if (!stat?.isFile() || !stat.size) throw new Error('Initialize a new volume with the init command, or import a verified database before starting Ultimate. Existing databases are never initialized automatically.');
  await import('../server.js');
} else {
  if (!commands[action]) throw new Error('Deployment command must be serve, init, owner, backup or migrate-notes.');
  process.argv = [process.argv[0], fileURLToPath(new URL(commands[action], import.meta.url)), ...args];
  await import(commands[action]);
}
