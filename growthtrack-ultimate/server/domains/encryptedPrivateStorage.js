import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { domainError } from './errors.js';

const format = 'aes256gcm-v1';
const overhead = 12 + 16;
export function createEncryptedPrivateStorage(storage, keyHex) {
  if (keyHex && !/^[a-f0-9]{64}$/i.test(keyHex)) throw new Error('APP_ENCRYPTION_KEY must be 32 random bytes encoded as 64 hexadecimal characters.');
  const key = keyHex ? Buffer.from(keyHex, 'hex') : null;
  const keyId = key ? createHash('sha256').update(key).digest('hex').slice(0, 16) : null;
  return {
    root: storage.root,
    async put(identifier, bytes) {
      if (!key) { await storage.put(identifier, bytes); return undefined; }
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from(`growthtrack:file:v1:${identifier}`));
      const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
      await storage.put(identifier, Buffer.concat([iv, cipher.getAuthTag(), ciphertext]));
      return { format, keyId };
    },
    async read(identifier, maximumBytes, encryption) {
      if (!encryption) return storage.read(identifier, maximumBytes);
      if (encryption.format !== format || !key || encryption.keyId !== keyId) throw domainError(503, 'FILE_KEY_REQUIRED', 'The encryption key for this file is unavailable. Restore the original deployment key.');
      const bytes = await storage.read(identifier, maximumBytes + overhead);
      try {
        if (bytes.length < overhead) throw new Error('Truncated file');
        const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
        decipher.setAAD(Buffer.from(`growthtrack:file:v1:${identifier}`));
        decipher.setAuthTag(bytes.subarray(12, 28));
        return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]);
      } catch { throw domainError(410, 'FILE_UNAVAILABLE', 'Stored file bytes could not be verified.'); }
    },
    remove: identifier => storage.remove(identifier),
  };
}
