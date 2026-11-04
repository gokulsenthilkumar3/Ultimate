import test from 'node:test';
import assert from 'node:assert/strict';
import { serviceAuthorized, directoryInput, firebaseDirectory } from './customerDirectory.mjs';

test('service identity rejects missing, incorrect and unconfigured tokens', () => {
  const token = '11'.repeat(32);
  assert.equal(serviceAuthorized(`Bearer ${token}`, token), true);
  for (const header of [null, 'Bearer invalid', `Bearer ${'22'.repeat(32)}`]) assert.equal(serviceAuthorized(header, token), false);
  assert.equal(serviceAuthorized(`Bearer ${token}`, ''), false);
});

test('directory bounds, filtering and projection preserve product scope without private auth data', async () => {
  const auth = { listUsers: async () => ({ users: [{ uid: 'b', displayName: 'Synthetic B', email: 'b@example.invalid', disabled: true, passwordHash: 'private' }, { uid: 'a', displayName: 'Synthetic A', email: 'a@example.invalid', disabled: false }] }) };
  const result = await firebaseDirectory(auth, directoryInput('https://finance.example/api/admin/customers?status=active'));
  assert.equal(result.total, 1);
  assert.equal(result.rows[0].id, 'a');
  assert.equal(result.rows[0].product, 'finsync');
  assert.equal(result.rows[0].plan, 'unavailable');
  assert.doesNotMatch(JSON.stringify(result), /passwordHash|private/);
  for (const query of ['limit=999', 'offset=-1', 'q=x&q=y', 'userId=victim']) assert.throws(() => directoryInput(`https://finance.example/?${query}`));
});

test('directory capacity is explicit rather than reporting a truncated total', async () => {
  let pages = 0;
  const auth = { listUsers: async () => { pages++; return { users: Array.from({ length: 1000 }, (_, i) => ({ uid: `${pages}:${i}` })), pageToken: 'more' }; } };
  await assert.rejects(firebaseDirectory(auth, directoryInput('https://finance.example/')), /DIRECTORY_CAPACITY/);
  assert.equal(pages, 10);
});
