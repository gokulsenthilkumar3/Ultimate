import test from 'node:test';
import assert from 'node:assert/strict';
import { saveEncryptedProfile } from './profileStore.mjs';

test('profile persistence writes encrypted and public projections atomically and preserves unrelated fields', async () => {
  const writes = [];
  const database = { collection: name => ({ doc: uid => `${name}/${uid}` }), runTransaction: async work => work({ get: async () => ({ data: () => ({ billing: { plan: 'existing' } }) }), set: (...args) => writes.push(args) }) };
  await saveEncryptedProfile(database, 'owner', { name: 'Synthetic', familySize: 2, income: 120000, pan: 'private' }, { ciphertext: 'encrypted' }, () => ({ monthly: { income: 10000 } }));
  assert.equal(writes[0][0], 'privateProfiles/owner');
  assert.equal(writes[0][1].ciphertext, 'encrypted');
  assert.equal(writes[1][0], 'users/owner');
  assert.deepEqual(writes[1][2], { merge: true });
  assert.equal(writes[1][1].profile.pan, undefined);
  assert.equal(writes[1][1].billing, undefined);
});

test('legacy ciphertext is never silently replaced by a new onboarding write', async () => {
  let writes = 0;
  const database = { collection: name => ({ doc: uid => `${name}/${uid}` }), runTransaction: async work => work({ get: async () => ({ data: () => ({ profile: { pan: 'legacy-ciphertext' } }) }), set: () => { writes++; } }) };
  await assert.rejects(saveEncryptedProfile(database, 'owner', {}, {}, () => ({})), error => error.code === 'PROFILE_MIGRATION_REQUIRED' && error.status === 409);
  assert.equal(writes, 0);
});
