import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const project = 'demo-finsync-security';
const enabled = process.env.FIRESTORE_EMULATOR_HOST === '127.0.0.1:18480'
  && process.env.FIREBASE_AUTH_EMULATOR_HOST === '127.0.0.1:19099';

test('patched Firebase client transport performs owner-scoped writes and rejects cross-owner reads', { skip: !enabled && 'Use the dedicated demo emulators' }, async () => {
  const clientApp = await import('firebase/app');
  const authSdk = await import('firebase/auth');
  const store = await import('firebase/firestore');
  const app = clientApp.initializeApp({ projectId: project, apiKey: 'synthetic-emulator-key' }, 'patched-client-transport');
  const auth = authSdk.getAuth(app);
  authSdk.connectAuthEmulator(auth, 'http://127.0.0.1:19099', { disableWarnings: true });
  const database = store.getFirestore(app);
  store.connectFirestoreEmulator(database, '127.0.0.1', 18480);
  try {
    const { user } = await authSdk.signInAnonymously(auth);
    const record = store.doc(database, 'users', user.uid);
    await store.setDoc(record, { email: 'transport@example.invalid', onboarded: false });
    assert.equal((await store.getDoc(record)).data().email, 'transport@example.invalid');
    await assert.rejects(store.getDoc(store.doc(database, 'users', 'another-owner')), error => error.code === 'permission-denied');
  } finally { await store.terminate(database); await authSdk.signOut(auth); await clientApp.deleteApp(app); }
});

test('Firestore profile rules protect PII, privileges and other owners while preserving ordinary edits', { skip: !enabled && 'Use firebase.security-tests.json with the demo project emulators' }, async () => {
  const app = initializeApp({ projectId: project }, 'profile-rules-test');
  const database = getFirestore(app);
  try {
    const signup = async () => {
      const response = await fetch(`http://127.0.0.1:19099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=synthetic-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
      assert.equal(response.status, 200);
      return response.json();
    };
    const owner = await signup(), other = await signup();
    const root = `http://127.0.0.1:18480/v1/projects/${project}/databases/(default)/documents`;
    const call = async (path, token, method = 'GET', body) => {
      const response = await fetch(`${root}/${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
      await response.text(); return response.status;
    };
    assert.equal(await call(`users/${owner.localId}`, owner.idToken, 'PATCH', { fields: { email: { stringValue: 'synthetic@example.invalid' }, onboarded: { booleanValue: false } } }), 200);
    assert.equal(await call(`users/${owner.localId}`, other.idToken), 403);
    const userRef = database.collection('users').doc(owner.localId);
    await userRef.set({ profile: { name: 'Synthetic', familySize: 1, onboarded: true }, billing: { plan: 'server-owned' } }, { merge: true });
    await database.collection('privateProfiles').doc(owner.localId).set({ ciphertext: 'synthetic-encrypted-envelope' });
    assert.equal(await call(`privateProfiles/${owner.localId}`, owner.idToken), 403);
    assert.equal(await call(`privateProfiles/${owner.localId}`, owner.idToken, 'PATCH', { fields: { ciphertext: { stringValue: 'forged' } } }), 403);
    assert.equal(await call(`users/${owner.localId}?updateMask.fieldPaths=profile.name`, owner.idToken, 'PATCH', { fields: { profile: { mapValue: { fields: { name: { stringValue: 'Updated' } } } } } }), 200);
    assert.equal(await call(`users/${owner.localId}?updateMask.fieldPaths=profile.pan`, owner.idToken, 'PATCH', { fields: { profile: { mapValue: { fields: { pan: { stringValue: 'client-controlled' } } } } } }), 403);
    assert.equal(await call(`users/${owner.localId}?updateMask.fieldPaths=billing`, owner.idToken, 'PATCH', { fields: { billing: { mapValue: { fields: { plan: { stringValue: 'forged' } } } } } }), 403);
    assert.equal(await call(`users/${owner.localId}?updateMask.fieldPaths=budget`, owner.idToken, 'PATCH', { fields: { budget: { mapValue: { fields: { rule: { stringValue: '50/30/20' } } } } } }), 200);
    assert.equal(await call(`users/${owner.localId}`, owner.idToken, 'DELETE'), 403);
  } finally { await database.terminate(); await deleteApp(app); }
});
