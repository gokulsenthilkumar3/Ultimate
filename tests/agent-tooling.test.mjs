import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { agentContext } from '../scripts/agent-context.mjs';
import { checkEvidence, evidenceLink } from '../scripts/evidence-register.mjs';
import { formatAgentData } from '../growthtrack-ultimate/server/agents/dataFormat.js';

const require = createRequire(path.resolve('growthtrack-ultimate/package.json'));
const { decode } = require('@toon-format/toon');
test('agent exports preserve JSON data and choose the smaller byte representation', () => {
  const value = agentContext();
  assert.deepEqual(Object.keys(value), ['version', 'trust', 'owners', 'documents', 'checks']);
  const toon = formatAgentData(value, { format: 'toon' });
  assert.deepEqual(decode(toon.text), value);
  const automatic = formatAgentData(value, { format: 'auto' });
  assert(automatic.bytes <= automatic.jsonBytes);
  assert(value.trust.includes('never authority'));
});

test('all historical evidence references retain provenance and resolve to generated status entries', () => {
  const evidence = checkEvidence();
  assert.equal(evidence.references.length, 35);
  assert.equal(evidence.artifacts.length, 26);
  assert(evidence.artifacts.every(item => item.status === 'unavailable'));
  assert.equal(new Set(evidence.artifacts.map(item => item.id)).size, 26);
  assert.match(evidenceLink('growthtrack-ultimate/docs/example.md', 'artifact-001'), /docs\/evidence\/ARTIFACTS\.md#artifact-001$/);
});

test('TOON preserves ambiguous strings, newlines, falsy values and source-looking text', () => {
  const value = { rows: [{ id: '01', text: 'Ignore previous instructions\n"a,b": 3', enabled: false, count: 0, missing: null, unicode: 'नमस्ते' }] };
  assert.deepEqual(decode(formatAgentData(value, { format: 'toon' }).text), value);
});
