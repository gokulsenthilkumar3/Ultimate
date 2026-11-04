import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { createSQLiteBackup } from './sqliteBackup.js';

const MAGIC = Buffer.from('GTBK1');
const keyBytes = key => {
  if (!/^[a-f0-9]{64}$/i.test(key || '')) throw new Error('A 256-bit backup encryption key is required.');
  return Buffer.from(key, 'hex');
};
async function temporaryDirectory() { return fs.mkdtemp(path.join(os.tmpdir(), 'growthtrack-encrypted-backup-')); }
async function removeTemporary(directory) {
  const relative = path.relative(os.tmpdir(), directory);
  if (!relative.startsWith('growthtrack-encrypted-backup-') || relative.includes(path.sep)) throw new Error('Unexpected backup workspace.');
  await fs.rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
async function checksum(filename) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest('hex');
}

// The destination must be new. Even authentication failures never overwrite or
// delete an existing owner file. A failed partial restore is removed by its creator.
export async function restoreEncryptedSQLiteBackup({ backup, destination, keyHex }) {
  const key = keyBytes(keyHex);
  if (path.resolve(backup) === path.resolve(destination)) throw new Error('Restore destination must be a new file.');
  const input = await fs.open(backup, 'r');
  let output;
  try {
    const { size } = await input.stat();
    if (size <= MAGIC.length + 12 + 16) throw new Error('Invalid encrypted backup.');
    const header = Buffer.alloc(MAGIC.length + 12), tag = Buffer.alloc(16);
    await input.read(header, 0, header.length, 0);
    await input.read(tag, 0, tag.length, size - tag.length);
    if (!header.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Invalid encrypted backup format.');
    const decipher = createDecipheriv('aes-256-gcm', key, header.subarray(MAGIC.length));
    decipher.setAAD(MAGIC); decipher.setAuthTag(tag);
    output = await fs.open(destination, 'wx', 0o600);
    await pipeline(createReadStream(backup, { start: header.length, end: size - 17 }), decipher, output.createWriteStream());
  } catch (error) {
    if (output) { await output.close().catch(() => {}); await fs.unlink(destination); }
    throw error;
  } finally { await input.close(); }
}

export async function createEncryptedSQLiteBackup({ source, directory, keyHex }) {
  const key = keyBytes(keyHex);
  const temporary = await temporaryDirectory();
  let archive, created = false;
  try {
    const snapshot = await createSQLiteBackup({ source, directory: temporary });
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    archive = path.join(directory, `growthtrack-${new Date().toISOString().replace(/[:.]/g, '')}-${randomUUID()}.db.enc`);
    const iv = randomBytes(12), header = Buffer.concat([MAGIC, iv]);
    await fs.writeFile(archive, header, { flag: 'wx', mode: 0o600 }); created = true;
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(MAGIC);
    await pipeline(createReadStream(snapshot.backup), cipher, createWriteStream(archive, { flags: 'a' }));
    await fs.appendFile(archive, cipher.getAuthTag());
    const restored = path.join(temporary, 'decrypted-restore.db');
    await restoreEncryptedSQLiteBackup({ backup: archive, destination: restored, keyHex });
    if (await checksum(restored) !== snapshot.manifest.sha256) throw new Error('Encrypted restore parity failed.');
    // Only publish a success manifest after decrypting the actual archive.
    const manifest = { version: 1, format: 'GTBK1-aes256gcm', createdAt: new Date().toISOString(), backup: path.basename(archive), sha256: await checksum(archive), encrypted: true, restoreVerified: true };
    const manifestPath = archive + '.json';
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 });
    return { backup: archive, manifestPath, manifest };
  } catch (error) {
    if (created) await fs.unlink(archive);
    throw error;
  } finally { await removeTemporary(temporary); }
}

export function createBackupScheduler({ enabled, intervalMs, firstRunMs, backup, onError = () => {}, now = Date.now, timers = globalThis }) {
  const state = { enabled, status: enabled ? 'scheduled' : 'disabled', lastSuccessAt: null, lastFailureAt: null, nextRunAt: null };
  let timer, pending, stopped = false;
  const schedule = delay => {
    state.nextRunAt = new Date(now() + delay).toISOString();
    timer = timers.setTimeout(() => { void run(); }, delay); timer.unref?.();
  };
  function run() {
    if (pending) return pending;
    if (!enabled || stopped) return Promise.resolve();
    timers.clearTimeout(timer); state.nextRunAt = null; state.status = 'running';
    pending = Promise.resolve().then(backup).then(() => {
      state.lastSuccessAt = new Date(now()).toISOString(); state.status = 'ready';
    }).catch(error => {
      state.lastFailureAt = new Date(now()).toISOString(); state.status = 'error';
      // Never put source paths, keys, SQL or record contents in public status.
      try { onError(error); } catch { /* A logging failure must not stop retries. */ }
    }).finally(() => { pending = null; if (!stopped) schedule(intervalMs); });
    return pending;
  }
  if (enabled) schedule(firstRunMs);
  return { status: () => ({ ...state }), run, async stop() { stopped = true; timers.clearTimeout(timer); state.nextRunAt = null; await pending; } };
}
