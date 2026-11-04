import test from 'node:test';
import assert from 'node:assert/strict';
import { checkTechnologyCatalog } from '../scripts/technology-catalog.mjs';
test('generated technology plans preserve evidence and unsupported boundaries', () => {
  const catalog = checkTechnologyCatalog();
  assert.equal(catalog.technologies.length, 56);
  const byId = Object.fromEntries(catalog.technologies.map(item => [item.id, item]));
  for (const id of ['mongodb', 'mern', 'graphql', 'aws', 'azure', 'gcp', 'kubernetes', 'oracle', 'spring-boot']) assert.equal(byId[id].status, 'adapter-required', id);
  for (const id of ['json', 'rest', 'sqlite', 'postgresql', 'laya', 'jev']) assert.equal(byId[id].status, 'present', id);
  assert(catalog.description.includes('do not install'));
});
