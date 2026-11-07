// Guarded recovery for a local installation with no encrypted dependents.
// Existing ciphertext requires a separately reviewed migration; never discard
// the only key capable of decrypting it. Default invocation is read-only.
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import { randomBytes, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';
import exposedHashes from '../server/exposedSecretHashes.json' with { type: 'json' };
import { loadServerConfig } from '../server/config.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const filename = path.join(root, '.env');
const original = await fs.readFile(filename, 'utf8');
const env = dotenv.parse(original);
const exposed = Object.keys(exposedHashes).filter(name => typeof env[name] === 'string'
  && exposedHashes[name].includes(createHash('sha256').update(env[name].trim().toLowerCase()).digest('hex')));
if (!exposed.length) { console.log('No historically exposed local deployment keys configured.'); process.exit(0); }
const database = env.DATABASE_URL || 'file:./dev.db';
if (!database.startsWith('file:')) throw new Error('Only local SQLite can be inventoried by this procedure.');
const dbFile = path.resolve(root, database.slice(5));
await fs.access(dbFile); // Never create storage while inspecting it.
const client = createClient({ url: `file:${dbFile.replaceAll('\\', '/')}` });
const counts = {};
try {
  await client.execute('PRAGMA query_only = ON');
  const tables = new Set((await client.execute("SELECT name FROM sqlite_master WHERE type='table'")).rows.map(row => row.name));
  if (tables.has('Document')) {
    const columns = new Set((await client.execute('PRAGMA table_info("Document")')).rows.map(row => row.name));
    const conditions = [];
    if (columns.has('encryptionFormat')) conditions.push('encryptionFormat IS NOT NULL');
    if (columns.has('data')) conditions.push("data LIKE '%aes256gcm-v1%'");
    if (!conditions.length) throw new Error('Document encryption metadata cannot be verified.');
    counts.encryptedDocuments = Number((await client.execute(`SELECT COUNT(*) AS n FROM Document WHERE ${conditions.join(' OR ')}`)).rows[0].n);
  } else counts.encryptedDocuments = 0;
  const encrypted = column => `(${column} IS NOT NULL AND ${column} <> '' AND ${column} NOT LIKE 'plain1:%')`;
  counts.sealedConnectorRows = tables.has('integration_credentials') ? Number((await client.execute(`SELECT COUNT(*) AS n FROM integration_credentials WHERE ${['clientIdCiphertext', 'accessTokenCiphertext', 'refreshTokenCiphertext'].map(encrypted).join(' OR ')}`)).rows[0].n) : 0;
} finally { client.close(); }
async function files(directory) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    if (entries.some(entry => entry.isSymbolicLink())) throw new Error('Cannot verify linked recovery storage.');
    return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : entry.isFile() ? [entry.name] : []))).flat();
  } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
counts.privateFiles = (await files(path.resolve(root, env.FILE_STORAGE_ROOT || 'server/private-files'))).filter(name => /^[a-f0-9]{64}$/.test(name)).length;
counts.encryptedBackups = (await files(path.resolve(root, env.BACKUP_DIR || 'backups'))).filter(name => name.endsWith('.db.enc')).length;
console.log(JSON.stringify({ exposedKeyNames: exposed, inventory: counts, valuesEmitted: false }));
if (Object.values(counts).some(count => count !== 0)) throw new Error('Encrypted or private dependents exist. No keys changed; rehearse a ciphertext migration first.');
if (!process.argv.includes('--apply')) { console.log('Dry run passed. --apply preserves a private recovery environment before replacing exposed keys.'); process.exit(0); }
const port = Number(env.PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid local API port.');
await new Promise((resolve, reject) => {
  const socket = net.connect({ host: '127.0.0.1', port });
  socket.once('connect', () => { socket.destroy(); reject(new Error('Stop the local API gracefully before rotating keys.')); });
  socket.once('error', error => error.code === 'ECONNREFUSED' ? resolve() : reject(new Error('Cannot verify local API is stopped.')));
  socket.setTimeout(2000, () => { socket.destroy(); reject(new Error('Cannot verify local API is stopped.')); });
});
let updated = original;
for (const name of exposed) {
  const pattern = new RegExp(`^${name}\\s*=.*$`, 'gm');
  if ([...updated.matchAll(pattern)].length !== 1) throw new Error('Ambiguous environment definition; no keys changed.');
  updated = updated.replace(pattern, `${name}=${randomBytes(32).toString('hex')}`);
}
loadServerConfig(dotenv.parse(updated));
if (await fs.readFile(filename, 'utf8') !== original) throw new Error('Environment changed during inspection; no keys changed.');
const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
const recovery = `${filename}.recovery-${stamp}`;
await fs.writeFile(recovery, original, { flag: 'wx', mode: 0o600 });
const temporary = `${filename}.rotation-${randomBytes(8).toString('hex')}`;
await fs.writeFile(temporary, updated, { flag: 'wx', mode: 0o600 });
await fs.rename(temporary, filename);
console.log(JSON.stringify({ rotated: exposed, recoveryPreserved: true, encryptedDependents: 0, restartRequired: true, valuesEmitted: false }));
