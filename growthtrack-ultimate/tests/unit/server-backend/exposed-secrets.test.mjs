import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { rejectExposedDeploymentSecrets } from '../../../server/exposedSecrets.js';

test('exposed fingerprints refuse serving keys without disclosing or rewriting key material', () => {
  const fixture = 'a'.repeat(64);
  const hash = createHash('sha256').update(fixture).digest('hex');
  for (const name of ['APP_ENCRYPTION_KEY', 'HANDOFF_SECRET']) {
    const environment = { [name]: fixture.toUpperCase() + '\n' };
    const before = { ...environment };
    assert.throws(() => rejectExposedDeploymentSecrets(environment, { [name]: [hash] }), error => {
      assert.match(error.message, /exposed in repository history/);
      assert.ok(!error.message.includes(fixture));
      return true;
    });
    assert.deepEqual(environment, before);
    assert.doesNotThrow(() => rejectExposedDeploymentSecrets({ [name]: 'b'.repeat(64) }, { [name]: [hash] }));
  }
});
