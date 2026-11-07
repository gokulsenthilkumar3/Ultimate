import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

function decodeBase32(secret) {
  let bits = 0, value = 0;
  const bytes = [];
  for (const character of secret) {
    const digit = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(character);
    if (digit < 0) throw new Error('Invalid Base32 MFA secret.');
    value = (value << 5) | digit; bits += 5;
    if (bits >= 8) { bits -= 8; bytes.push((value >>> bits) & 255); }
  }
  return Buffer.from(bytes);
}

// RFC 6238, 30-second period. Options exist for the published test vectors;
// owner authentication always uses SHA-1 and six digits for app compatibility.
export function totpAt(secret, milliseconds, { digits = 6, algorithm = 'sha1' } = {}) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(milliseconds / 30_000)));
  const mac = createHmac(algorithm, decodeBase32(secret)).update(counter).digest();
  const offset = mac[mac.length - 1] & 15;
  return String((mac.readUInt32BE(offset) & 0x7fffffff) % (10 ** digits)).padStart(digits, '0');
}

export const mfaKeyId = secret => createHash('sha256').update(secret).digest('hex').slice(0, 16);
export const sessionCsrfHash = (digest, secret) => secret ? `mfa1:${mfaKeyId(secret)}:${digest}` : digest;
export const csrfDigest = stored => stored.startsWith('mfa1:') ? stored.split(':')[2] : stored;
export const sessionHasMfa = (stored, secret) => stored.startsWith(`mfa1:${mfaKeyId(secret)}:`);

export async function consumeOwnerCode({ prisma, secret, userId, code, now = Date.now() }) {
  if (!/^\d{6}$/.test(String(code || ''))) return false;
  const current = Math.floor(now / 30_000);
  let matched = null;
  for (const counter of [current, current - 1, current + 1]) {
    if (counter >= 0 && timingSafeEqual(Buffer.from(String(code)), Buffer.from(totpAt(secret, counter * 30_000)))) { matched = counter; break; }
  }
  if (matched === null) return false;
  // Persist a monotonic counter in existing private settings. The conditional
  // upsert rejects replays across concurrent logins, restarts and instances.
  const key = `private:owner-mfa:${mfaKeyId(secret)}:${userId}`;
  if (prisma.$growthtrackProvider === 'sqlserver') {
    const changed = await prisma.$executeRaw`
      MERGE dbo.app_settings WITH (HOLDLOCK) AS target
      USING (VALUES (${randomUUID()}, ${key}, ${String(matched)})) AS source(id, [key], value)
      ON target.[key]=source.[key]
      WHEN MATCHED AND TRY_CONVERT(BIGINT,target.value)<${matched}
        THEN UPDATE SET value=source.value, updatedAt=SYSUTCDATETIME()
      WHEN NOT MATCHED THEN INSERT (id,[key],value,category) VALUES(source.id,source.[key],source.value,'security');`;
    return changed === 1;
  }
  const changed = await prisma.$executeRaw`
    INSERT INTO app_settings (id, key, value, category) VALUES (${randomUUID()}, ${key}, ${String(matched)}, 'security')
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = CURRENT_TIMESTAMP
    WHERE CAST(app_settings.value AS INTEGER) < ${matched}`;
  return changed === 1;
}
