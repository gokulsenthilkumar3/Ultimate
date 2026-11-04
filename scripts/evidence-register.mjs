import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'growthtrack-ultimate/package.json'));
const { decode } = require('@toon-format/toon');
const { z } = require('zod');
const localPath = z.string().min(1).max(400).refine(value => !path.posix.isAbsolute(value) && !value.includes('\\') && !value.split('/').includes('..') && !value.includes(':'), 'Expected a repository-relative path');
const evidenceSchema = z.object({
  version: z.literal(1), reviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  artifacts: z.array(z.object({ id: z.string().regex(/^artifact-\d{3}$/), path: localPath, status: z.enum(['unavailable', 'retained']), source: localPath, sourceRole: z.enum(['writer', 'related']) }).strict()).max(200),
  references: z.array(z.object({ document: localPath, originalTarget: z.string().min(1).max(500), artifact: z.string().regex(/^artifact-\d{3}$/) }).strict()).max(500),
}).strict();
export const REGISTER = 'docs/evidence/artifacts.toon';
const PAGE = 'docs/evidence/ARTIFACTS.md';
const SCHEMA = 'docs/evidence/artifacts.schema.json';

function localFile(file, { maxBytes = 1024 * 1024 } = {}) {
  const absolute = path.resolve(root, file);
  if (!absolute.startsWith(root + path.sep)) throw new Error('Evidence path escaped the workspace.');
  const actual = fs.realpathSync(absolute);
  if (actual !== absolute || !actual.startsWith(root + path.sep)) throw new Error('Evidence paths must not redirect through symbolic links.');
  if (!fs.statSync(actual).isFile() || fs.statSync(actual).size > maxBytes) throw new Error('Evidence file exceeds its bound or is not a regular file.');
  return actual;
}

export function evidenceLink(document, id) {
  return path.relative(path.dirname(path.join(root, document)), path.join(root, PAGE)).replaceAll('\\', '/') + '#' + id;
}

export function readEvidence() {
  const text = fs.readFileSync(localFile(REGISTER, { maxBytes: 256 * 1024 }), 'utf8');
  const data = evidenceSchema.parse(decode(text));
  const tracked = new Set(execFileSync('git', ['ls-files', '--cached', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).split('\0').filter(Boolean));
  const ids = new Set(), paths = new Set();
  for (const item of data.artifacts) {
    if (ids.has(item.id) || paths.has(item.path)) throw new Error('Duplicate evidence record.');
    ids.add(item.id); paths.add(item.path);
    localFile(item.source);
    if (tracked.has(item.path) !== (item.status === 'retained')) throw new Error(`Tracked artifact availability changed: ${item.id}. Review its status explicitly.`);
    if (item.status === 'retained') localFile(item.path, { maxBytes: 64 * 1024 * 1024 });
  }
  for (const reference of data.references) {
    if (!ids.has(reference.artifact)) throw new Error('Unknown evidence reference.');
    const artifact = data.artifacts.find(item => item.id === reference.artifact);
    const original = path.resolve(root, path.dirname(reference.document), reference.originalTarget);
    if (original !== path.resolve(root, artifact.path)) throw new Error('Evidence provenance target changed.');
    const source = fs.readFileSync(localFile(reference.document), 'utf8');
    if (!source.includes(`](${evidenceLink(reference.document, reference.artifact)})`)) throw new Error(`Missing repaired evidence link: ${reference.document}, ${reference.artifact}`);
  }
  return data;
}

export function renderEvidence(data) {
  const lines = ['# Historical artifact register', '', `Reviewed: ${data.reviewedAt}. ${data.references.length} historical references identify ${data.artifacts.length} distinct artifacts.`, '',
    'Availability describes evidence retained in version control, not transient files on one machine. The original files are not supplied by this register. An unavailable entry is not a passed test, a replacement screenshot, or fresh visual evidence. The historical documents now link here so their provenance remains accessible without dead file links.', '',
    'The TOON data in `artifacts.toon` is the source of truth. Its JSON Schema remains JSON for tooling interoperability. Run `npm run evidence:check`; regenerate this page and the schema with `npm run evidence:sync`.', '',
    'Sources marked writer were identified in current code, but have not been rerun here. Related sources provide context where the original writer is unconfirmed. Neither label proves that the old artifact can be reproduced byte-for-byte. Review fixtures, dependencies, privacy and output paths before executing anything. Raw local images, databases or provider output must not be published automatically.', ''];
  for (const item of data.artifacts) {
    const sources = [...new Set(data.references.filter(reference => reference.artifact === item.id).map(reference => reference.document))];
    lines.push(`## ${item.id}`, '', `- Original path: \`${item.path}\``, `- Availability: **${item.status}**; historical verification remains unconfirmed.`, `- Source: [${item.sourceRole === 'writer' ? 'identified writer; not rerun' : 'related context; writer unconfirmed'}](../../${item.source.replaceAll(' ', '%20')})`, '- Historical references: ' + sources.map(source => `[${path.basename(source)}](../../${source.replaceAll(' ', '%20')})`).join(', '), '');
  }
  return lines.join('\n');
}

export function checkEvidence({ write = false } = {}) {
  const data = readEvidence();
  const generated = [[PAGE, renderEvidence(data)], [SCHEMA, JSON.stringify(z.toJSONSchema(evidenceSchema), null, 2) + '\n']];
  for (const [file, content] of generated) {
    if (write) {
      const target = path.join(root, file);
      if (fs.realpathSync(path.dirname(target)) !== path.dirname(target) || fs.lstatSync(target, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error('Generated evidence paths must not redirect through symbolic links.');
      fs.writeFileSync(target, content);
    } else if (!fs.existsSync(path.join(root, file)) || fs.readFileSync(localFile(file), 'utf8').replaceAll('\r\n', '\n') !== content) throw new Error(`Evidence documentation drift: ${file}`);
  }
  return data;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = checkEvidence({ write: process.argv.includes('--write') });
  console.log(`Evidence register: ${data.references.length} repaired references, ${data.artifacts.length} artifacts; ${data.artifacts.filter(item => item.status === 'unavailable').length} unavailable. No verification evidence fabricated.`);
}
