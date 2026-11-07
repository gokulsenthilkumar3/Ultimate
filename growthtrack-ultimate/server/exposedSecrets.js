import { createHash } from 'node:crypto';
import exposedHashes from './exposedSecretHashes.json' with { type: 'json' };

/** Deny reuse of keys published in PR #2. Fingerprints are not key material.
 * Recovery tools intentionally retain access to old ciphertext; only serving
 * traffic and deployment setup are blocked until an operator migrates safely. */
export function rejectExposedDeploymentSecrets(environment, hashes = exposedHashes) {
  for (const [name, blocked] of Object.entries(hashes)) {
    const value = environment[name];
    if (typeof value !== 'string' || !value.trim()) continue;
    const digest = createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
    if (blocked.includes(digest)) throw new Error(`${name} was exposed in repository history. Startup refused. Preserve recovery keys and follow docs/DEPLOYMENT.md before rotating; no key files were changed.`);
  }
}
