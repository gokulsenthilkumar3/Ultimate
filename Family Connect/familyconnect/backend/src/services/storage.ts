import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';

/**
 * Where uploaded family files live. Controllers and the database know only the opaque key (stored as
 * "/uploads/<key>"); the adapter decides what that means. Authorization is never the adapter's job:
 * callers check tree access first, and an adapter never hands out a URL that bypasses that check.
 *
 * Adding AWS S3 or Azure Blob is a new module that implements this interface and calls
 * registerStorageAdapter, then runs the shared contract in tests/storage.test.cjs. The two clouds are
 * not interchangeable by changing an endpoint string; each gets its own adapter and tests.
 */
export type OpenedObject =
  | { kind: 'file'; path: string }
  | { kind: 'stream'; stream: Readable; size?: number };

export interface StorageAdapter {
  readonly name: string;
  /** Creates a new object. Refuses to overwrite an existing key. */
  put(key: string, data: Buffer): Promise<void>;
  /** Null when the object does not exist. */
  open(key: string): Promise<OpenedObject | null>;
  /** Removing a missing object is not an error. */
  remove(key: string): Promise<void>;
}

export class StorageError extends Error {
  constructor(public code: 'invalid_key' | 'exists' | 'unknown_provider', message: string) { super(message); }
}

const WRITE_KEY = /^[A-Za-z0-9_-]+\.[A-Za-z0-9]{1,10}$/; // keys this service creates
const READ_KEY = /^[A-Za-z0-9_.-]+$/;                    // older files may contain more dots
const safeKey = (key: string, pattern: RegExp) => {
  if (typeof key !== 'string' || key === '.' || key === '..' || key.length > 200 || !pattern.test(key)) throw new StorageError('invalid_key', 'Unknown storage reference.');
  return key;
};

/** The existing behavior: files in the service's uploads folder, plus a legacy folder that is read and cleaned but never written. */
export function createLocalStorage({ root = path.resolve(__dirname, '../../uploads'), legacyRoots = [path.resolve(__dirname, '../../../uploads')] }: { root?: string; legacyRoots?: string[] } = {}): StorageAdapter {
  return {
    name: 'local',
    async put(key, data) {
      safeKey(key, WRITE_KEY);
      await fs.mkdir(root, { recursive: true });
      try { await fs.writeFile(path.join(root, key), data, { flag: 'wx' }); }
      catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new StorageError('exists', 'The storage key already exists.'); throw error; }
    },
    async open(key) {
      safeKey(key, READ_KEY);
      for (const directory of [root, ...legacyRoots]) {
        const file = path.join(directory, key);
        try { await fs.access(file); return { kind: 'file', path: file }; } catch { /* keep looking; legacy files stay in place */ }
      }
      return null;
    },
    async remove(key) {
      safeKey(key, WRITE_KEY);
      for (const directory of [root, ...legacyRoots]) {
        try { await fs.unlink(path.join(directory, key)); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      }
    },
  };
}

/** In-memory adapter for tests and development. It proves callers do not depend on the filesystem; do not use it for real files. */
export function createMemoryStorage(): StorageAdapter & { keys(): string[] } {
  const objects = new Map<string, Buffer>();
  return {
    name: 'memory',
    keys: () => [...objects.keys()].sort(),
    async put(key, data) { safeKey(key, WRITE_KEY); if (objects.has(key)) throw new StorageError('exists', 'The storage key already exists.'); objects.set(key, Buffer.from(data)); },
    async open(key) { safeKey(key, READ_KEY); const data = objects.get(key); return data ? { kind: 'stream', stream: Readable.from([data]), size: data.length } : null; },
    async remove(key) { safeKey(key, WRITE_KEY); objects.delete(key); },
  };
}

const factories = new Map<string, () => StorageAdapter>([['local', () => createLocalStorage()]]);
export function registerStorageAdapter(name: string, factory: () => StorageAdapter): void { factories.set(name, factory); }

let selected: StorageAdapter | null = null;
/** FAMILY_STORAGE selects the adapter (default "local"). An unknown name fails loudly instead of silently using local disk. */
export function getStorage(env: NodeJS.ProcessEnv = process.env): StorageAdapter {
  const name = (env.FAMILY_STORAGE || 'local').trim();
  if (selected && selected.name === name) return selected;
  const factory = factories.get(name);
  if (!factory) throw new StorageError('unknown_provider', `Storage provider "${name.slice(0, 40)}" is not installed. Register an adapter or use "local".`);
  return (selected = factory());
}

/** The persisted reference for a key, and back. Only keys this service could have created are accepted. */
export const storageReference = (key: string) => '/uploads/' + safeKey(key, READ_KEY);
export function keyFromReference(reference: string): string {
  if (typeof reference !== 'string' || !reference.startsWith('/uploads/')) throw new StorageError('invalid_key', 'Unknown storage reference.');
  return safeKey(reference.slice('/uploads/'.length), READ_KEY);
}
