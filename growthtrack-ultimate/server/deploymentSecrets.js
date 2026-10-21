import { readFileSync } from 'node:fs';

// Compose mounts secrets as files; allow only fields explicitly supported here.
// Values are never logged. Conflicting direct/file configuration fails closed.
export function loadDeploymentSecrets(environment = process.env, read = readFileSync) {
  for (const name of ['APP_ENCRYPTION_KEY', 'HANDOFF_SECRET', 'OWNER_PASSWORD', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'GITHUB_CLIENT_SECRET']) {
    const filename = environment[`${name}_FILE`];
    if (!filename) continue;
    if (environment[name]) throw new Error(`Configure either ${name} or ${name}_FILE, not both.`);
    const value = read(filename, 'utf8').trim();
    if (!value || value.length > 16_384) throw new Error(`${name}_FILE must contain a nonempty secret.`);
    environment[name] = value;
  }
}
