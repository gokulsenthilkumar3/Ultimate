import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'growthtrack-ultimate/package.json'));
const { encode, decode } = require('@toon-format/toon');
export const CATALOG = 'growthtrack-ultimate/src/config/technologyCatalog.json';
export function checkTechnologyCatalog({ write = false } = {}) {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, CATALOG), 'utf8'));
  const ids = new Set();
  for (const item of catalog.technologies) {
    if (ids.has(item.id) || !/^[a-z0-9-]+$/.test(item.id)) throw new Error('Invalid/duplicate technology ID.');
    ids.add(item.id);
    if (!['present', 'reference-only', 'adapter-required'].includes(item.status)) throw new Error('Invalid technology status.');
    if (item.status !== 'adapter-required' && (!item.evidence || !fs.existsSync(path.join(root, item.evidence)))) throw new Error(`Missing source evidence: ${item.id}`);
  }
  const toon = encode(catalog) + '\n';
  if (JSON.stringify(decode(toon)) !== JSON.stringify(catalog)) throw new Error('Technology catalog round trip failed.');
  const lines = ['# Technology customization catalog', '', 'Generated from `growthtrack-ultimate/src/config/technologyCatalog.json`. Edit that source, then run `npm run technology:sync`. The TOON export carries identical data for agents.', '',
    'The Stack button in the authenticated portal saves an account-scoped planning profile in this browser. Export/import accepts only known technology IDs. It never installs packages, changes live providers, provisions cloud resources or migrates data. Required runtime credentials remain server-only.', '',
    '**Status meanings:** present means checked-in code, not verified credentials/deployment; reference-only means incomplete source/configuration; adapter-required means native integration is not implemented. Selecting an entry is not enabling it. The [optional adapter kit](../growthtrack-ultimate/integrations/adapters/README.md) provides 32 disabled service boundaries and templates; verify them with `npm run adapters:check`.', '',
    'The existing modular portal and independent product services remain the recommended baseline. MERN is an optional service profile: React/Express/Node already exist, but MongoDB storage would need an owned adapter and migration/backup/authorization tests. Do not replace current SQLite/PostgreSQL owners to satisfy a stack label.', ''];
  for (const category of new Set(catalog.technologies.map(item => item.category))) {
    lines.push(`## ${category}`, '', '| Technology | Status | Owner | Scope and evidence |', '| --- | --- | --- | --- |');
    for (const item of catalog.technologies.filter(row => row.category === category)) lines.push(`| ${item.label} | ${item.status} | ${item.owner} | ${item.note}${item.evidence ? ` [Source](../${item.evidence.replaceAll(' ', '%20')})` : ''} |`);
    lines.push('');
  }
  lines.push('## Completion boundary', '', 'Every technology requested is represented in this catalog and can be selected in a validated planning profile. The adapter-required entries are not implemented systems. Supporting multiple clouds, databases, languages and CI providers requires separate versioned contracts, fixtures and deployment evidence for each owner. This pass does not create paid services, external repositories, database migrations or CI accounts.', '', 'Use [the agent workflow](AGENT_WORKFLOW.md) for Jev/Laya and [the Laya integration guide](../growthtrack-ultimate/integrations/laya/README.md) for local setup. No GrowthTrack benchmark establishes that Laya is better than Jev.', '');
  for (const [file, text] of [['docs/TECHNOLOGY_CATALOG.md', lines.join('\n')], ['docs/technology-catalog.toon', toon]]) {
    if (write) fs.writeFileSync(path.join(root, file), text);
    else if (!fs.existsSync(path.join(root, file)) || fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n') !== text) throw new Error(`Technology catalog drift: ${file}`);
  }
  return catalog;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkTechnologyCatalog({ write: process.argv.includes('--write') });
  console.log(`Technology catalog: ${result.technologies.length} entries verified; profile choices do not provision infrastructure.`);
}
