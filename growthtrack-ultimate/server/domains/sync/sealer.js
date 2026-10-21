import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { domainError } from '../errors.js';

const SEALED = 'gcm1:';
const PLAIN = 'plain1:';

/** Seals connector state bound to one owner/provider row. Without
    APP_ENCRYPTION_KEY only secret-free configuration can be stored, and it is
    labelled plain so a later key rotation never mistakes it for ciphertext. */
export function createSealer(keyHex) {
  if (keyHex && !/^[a-f0-9]{64}$/i.test(keyHex)) throw new Error('APP_ENCRYPTION_KEY must be 32 random bytes encoded as 64 hexadecimal characters.');
  const key = keyHex ? Buffer.from(keyHex, 'hex') : null;
  const keyId = key ? createHash('sha256').update(key).digest('hex').slice(0, 16) : null;
  const aad = context => Buffer.from(`growthtrack:sync:v1:${context}`);
  return {
    canSeal: Boolean(key),
    seal(value, context, { requireEncryption = false } = {}) {
      const json = Buffer.from(JSON.stringify(value ?? null), 'utf8');
      if (!key) {
        if (requireEncryption) throw domainError(503, 'ENCRYPTION_KEY_REQUIRED', 'Set APP_ENCRYPTION_KEY on the server before saving a connection secret.');
        return PLAIN + json.toString('base64');
      }
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(aad(context));
      const ciphertext = Buffer.concat([cipher.update(json), cipher.final()]);
      return `${SEALED}${keyId}:${Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64')}`;
    },
    open(text, context) {
      if (!text) return null;
      if (text.startsWith(PLAIN)) return JSON.parse(Buffer.from(text.slice(PLAIN.length), 'base64').toString('utf8'));
      const [, storedKeyId, payload] = text.match(/^gcm1:([a-f0-9]{16}):(.+)$/) || [];
      if (!payload) throw domainError(410, 'CONNECTION_UNREADABLE', 'Stored connection settings are not readable. Disconnect and connect again.');
      if (!key || storedKeyId !== keyId) throw domainError(503, 'ENCRYPTION_KEY_REQUIRED', 'The key that sealed this connection is unavailable. Restore APP_ENCRYPTION_KEY or reconnect.');
      try {
        const bytes = Buffer.from(payload, 'base64');
        const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
        decipher.setAAD(aad(context));
        decipher.setAuthTag(bytes.subarray(12, 28));
        return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'));
      } catch {
        throw domainError(410, 'CONNECTION_UNREADABLE', 'Stored connection settings could not be verified. Disconnect and connect again.');
      }
    },
  };
}
