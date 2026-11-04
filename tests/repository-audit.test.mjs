import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, privatePath, relativeLinks, dockerBoundaryReopened } from '../scripts/repository-audit.mjs';

test('file policy distinguishes ownership material from historical/vendor reference', () => {
  assert.equal(classify('growthtrack-ultimate/src/domains/family/FamilyPage.tsx'), 'source');
  assert.equal(classify('.github/workflows/ci.yml'), 'configuration');
  assert.equal(classify('docs/ARCHITECTURE.md'), 'documentation');
  assert.equal(classify('docs/archive/old-plan.md'), 'historical');
  assert.equal(classify('growthtrack-ultimate/.windsurf/skills/reference.md'), 'agent-reference');
  assert.equal(classify('growthtrack-ultimate/docs/licenses/LICENSE.md'), 'provenance');
  assert.equal(classify('Forex/Dataset/research.xlsx'), 'asset-or-reference');
  assert.equal(classify('growthtrack-ultimate/src/domain/contract.toon'), 'configuration');
});

test('private-file detection protects real environments and encrypted databases without hiding templates', () => {
  for (const file of ['.env', 'FinSync/apps/web/.env.local', 'Forex/runtime.env', 'growthtrack-ultimate/owner.db', 'growthtrack-ultimate/backup.db.enc.json', 'Forex/.aws/credentials', 'FinSync/node_modules/package/index.js', 'credentials.json', 'FinSync/service-account-prod.json', 'Forex/.streamlit/secrets.toml', '.secrets/client.json', 'serviceAccountKey-prod.json', 'firebase-adminsdk-prod.json']) assert.equal(privatePath(file), true, file);
  for (const file of ['Forex/.env.example', 'growthtrack-ultimate/.env.test', 'FinSync/apps/web/lib/environment.ts', 'growthtrack-ultimate/prisma/schema.prisma']) assert.equal(privatePath(file), false, file);
});

test('documentation links decode paths and exclude examples, fragments and external schemes', () => {
  assert.deepEqual(relativeLinks('[Plan](Eng%20Plan.md#scope)\n[external](https://example.test)\n[section](#scope)\n[file](<notes/Long name.md>)\n```md\n[example](absent.md)\n```'), ['Eng Plan.md', 'notes/Long name.md']);
});

test('image and reference-definition targets receive file-link validation', () => {
  assert.deepEqual(relativeLinks('![Diagram](diagrams/current.svg)\n[policy][p]\n[p]: <docs/Policy note.md>'), ['diagrams/current.svg', 'docs/Policy note.md']);
});

test('Docker allowlists must precede private-file exclusions', () => {
  assert.equal(dockerBoundaryReopened(['*', '!src/**', '**/.env*'], ['**/.env*']), false);
  assert.equal(dockerBoundaryReopened(['**/.env*', '!**/.env.local'], ['**/.env*']), true);
});
