import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { createClient } from '@libsql/client';

const quote = name => `"${name.replaceAll('"', '""')}"`;
const url = filename => `file:${filename.replaceAll('\\', '/')}`;
async function inspect(filename) {
  const client = createClient({ url: url(filename) });
  try {
    const integrity = await client.execute('PRAGMA integrity_check');
    if (integrity.rows.length !== 1 || Object.values(integrity.rows[0])[0] !== 'ok') throw new Error('SQLite integrity verification failed.');
    const foreignKeys = await client.execute('PRAGMA foreign_key_check');
    if (foreignKeys.rows.length) throw new Error('SQLite contains unresolved foreign-key violations.');
    const schema = await client.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
    const counts = {};
    for (const row of schema.rows) counts[row.name] = Number((await client.execute(`SELECT count(*) AS count FROM ${quote(row.name)}`)).rows[0].count);
    return { integrity: 'ok', foreignKeys: 'ok', counts, schemaHash: createHash('sha256').update(JSON.stringify(schema.rows)).digest('hex') };
  } finally { client.close(); }
}

// A restore drill creates a fresh destination; it never replaces owner storage.
// VACUUM INTO includes committed WAL content in a consistent standalone file.
export async function createSQLiteBackup({ source, directory }) {
  const absoluteSource = path.resolve(source);
  if (!(await fs.stat(absoluteSource)).isFile()) throw new Error('The SQLite source must be an existing file.');
  const backupDirectory = path.resolve(directory);
  await fs.mkdir(backupDirectory, { recursive: true, mode: 0o700 });
  const stem = `growthtrack-${new Date().toISOString().replace(/[:.]/g, '')}-${randomUUID()}`;
  const backup = path.join(backupDirectory, `${stem}.db`);
  const restored = path.join(backupDirectory, `${stem}-restore-check.db`);
  if (backup === absoluteSource || restored === absoluteSource) throw new Error('A backup cannot replace its source.');
  const client = createClient({ url: url(absoluteSource) });
  try {
    await client.execute('PRAGMA synchronous=FULL');
    await client.execute({ sql: 'VACUUM INTO ?', args: [backup] });
  }
  finally { client.close(); }
  await fs.chmod(backup, 0o600);
  const proof = await inspect(backup);
  await fs.copyFile(backup, restored, fs.constants.COPYFILE_EXCL);
  await fs.chmod(restored, 0o600);
  const restoreProof = await inspect(restored);
  if (JSON.stringify(proof) !== JSON.stringify(restoreProof)) throw new Error('The restored backup failed parity verification.');
  const sha256 = createHash('sha256').update(await fs.readFile(backup)).digest('hex');
  const manifest = { version: 1, createdAt: new Date().toISOString(), backup: path.basename(backup), restoreCheck: path.basename(restored), sha256, ...proof, restoreVerified: true, encrypted: false };
  const manifestPath = path.join(backupDirectory, `${stem}.json`);
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 });
  return { backup, restored, manifestPath, manifest };
}

export function localDatabaseFile(root, environment = process.env) {
  if (environment.DATABASE_FILE) return path.resolve(root, environment.DATABASE_FILE);
  const configured = environment.DATABASE_URL || 'file:./dev.db';
  if (!configured.startsWith('file:') || configured.startsWith('file://')) throw new Error('This backup command supports a local SQLite file only.');
  return path.resolve(root, configured.slice(5));
}
