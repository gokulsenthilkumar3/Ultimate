import test from 'node:test';
import assert from 'node:assert/strict';
import { createDecipheriv } from 'node:crypto';
import { createProfileHandler, profileKey, encryptProfile, validateProfile } from './profileService.mjs';

const environment = { NODE_ENV: 'production', FINSYNC_APP_ORIGIN: 'https://finance.example', FINSYNC_PROFILE_ENCRYPTION_KEY: '11'.repeat(32), FINSYNC_PROFILE_KEY_VERSION: 'test-v1' };
const profile = { name: 'Synthetic User', pan: 'ABCDE1234F', dob: '1990-01-01', phone: '9876543210', income: '120000', familySize: '2' };
const request = (body = profile, headers = {}) => new Request('https://finance.example/api/profile/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer synthetic-token', Origin: 'https://finance.example', ...headers }, body: JSON.stringify(body) });

test('encrypted profile binds owner and key version, with unique randomized ciphertext', () => {
  const config = profileKey(environment), data = validateProfile(profile);
  const envelope = encryptProfile('owner-a', data, config);
  assert.notEqual(envelope.ciphertext, encryptProfile('owner-a', data, config).ciphertext);
  const decrypt = uid => {
    const cipher = createDecipheriv('aes-256-gcm', config.key, Buffer.from(envelope.iv, 'base64'));
    cipher.setAAD(Buffer.from(JSON.stringify(['finsync-profile', uid, envelope.keyVersion])));
    cipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    return JSON.parse(Buffer.concat([cipher.update(Buffer.from(envelope.ciphertext, 'base64')), cipher.final()]));
  };
  assert.deepEqual(decrypt('owner-a'), data);
  assert.throws(() => decrypt('owner-b'));
});

test('profile authorization derives the owner from the verified token, never client input', async () => {
  let saved;
  const handler = createProfileHandler({ environment, verifyToken: async () => ({ uid: 'verified-owner' }), save: async (...args) => { saved = args; } });
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(saved[0], 'verified-owner');
  assert.equal((await handler(request({ ...profile, uid: 'victim' }))).status, 400);
  assert.equal((await handler(request(profile, { Origin: 'https://attacker.example' }))).status, 403);
  assert.equal((await handler(request(profile, { Authorization: '' }))).status, 401);
});

test('invalid tokens, missing keys, malformed data, and oversize input cannot save', async () => {
  let writes = 0;
  const base = { environment, verifyToken: async () => ({ uid: 'owner' }), save: async () => { writes++; } };
  assert.equal((await createProfileHandler({ ...base, verifyToken: async () => { throw new Error('revoked'); } })(request())).status, 401);
  assert.equal((await createProfileHandler({ ...base, environment: { ...environment, FINSYNC_PROFILE_ENCRYPTION_KEY: '' } })(request())).status, 503);
  const handler = createProfileHandler(base);
  for (const invalid of [{ dob: '2000-02-31' }, { income: '10junk' }, { familySize: '2.5' }, { pan: 'bad' }, { income: 'Infinity' }]) assert.equal((await handler(request({ ...profile, ...invalid }))).status, 400);
  assert.equal((await handler(request({ ...profile, name: 'x'.repeat(20000) }))).status, 413);
  assert.equal(writes, 0);
});
