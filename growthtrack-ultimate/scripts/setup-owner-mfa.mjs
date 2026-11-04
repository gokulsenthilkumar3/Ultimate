import { randomBytes } from 'node:crypto';

// Run locally in a private terminal. This prints a NEW secret, never reads or
// modifies an existing account, environment or database.
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const bytes = randomBytes(20);
let bits = 0, value = 0, secret = '';
for (const byte of bytes) {
  value = (value << 8) | byte; bits += 8;
  while (bits >= 5) { bits -= 5; secret += alphabet[(value >>> bits) & 31]; }
}
console.log('Keep the following secret private. Add it to your authenticator BEFORE enabling it on the server.');
console.log(`OWNER_MFA_SECRET=${secret}`);
console.log(`otpauth://totp/GrowthTrack:Owner?secret=${secret}&issuer=GrowthTrack&algorithm=SHA1&digits=6&period=30`);
console.log('Save OWNER_MFA_SECRET in the ignored backend environment or deployment secret manager, then restart. Keep a protected recovery copy.');
