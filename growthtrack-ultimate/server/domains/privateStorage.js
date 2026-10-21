import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { domainError } from './errors.js';

export function createPrivateStorage(root) {
  const directory = path.resolve(root);
  function filePath(key) {
    if (!/^[a-f0-9]{64}$/.test(key)) throw domainError(400, 'INVALID_STORAGE_KEY', 'Invalid file identifier.');
    return path.join(directory, key);
  }
  return {
    root: directory,
    async put(key, bytes) {
      await fs.mkdir(directory, { recursive: true, mode: 0o700 });
      await fs.writeFile(filePath(key), bytes, { flag: 'wx', mode: 0o600 });
    },
    async read(key, maximumBytes) {
      let handle;
      try {
        handle = await fs.open(filePath(key), constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
        const stat = await handle.stat();
        if (!stat.isFile() || stat.size > maximumBytes) throw domainError(410, 'FILE_UNAVAILABLE', 'File bytes are unavailable.');
        return await handle.readFile();
      } catch (error) {
        if (['ENOENT', 'ELOOP'].includes(error.code)) throw domainError(410, 'FILE_UNAVAILABLE', 'File bytes are unavailable.');
        throw error;
      } finally { await handle?.close(); }
    },
    async remove(key) {
      try { await fs.unlink(filePath(key)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    },
  };
}
