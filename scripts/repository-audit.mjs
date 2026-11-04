import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { checkEvidence } from './evidence-register.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'growthtrack-ultimate/package.json'));
const yaml = require('js-yaml');
const ts = require('typescript');
const { decode: decodeToon } = require('@toon-format/toon');
const policy = JSON.parse(fs.readFileSync(path.join(root, 'docs/repository-policy.json'), 'utf8'));
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });

export function classify(file) {
  if (/(^|\/)\.(agents|claude|windsurf|codex)\//.test(file)) return 'agent-reference';
  if (/^Claude\/|\/licenses\//.test(file)) return 'provenance';
  if (/^docs\/archive\/|\/docs\/(3d-plans|real-human-3d|redesign-research|ui-review)\//.test(file)
      || policy.historicalRootNotes.includes(file)) return 'historical';
  if (/\.md$/i.test(file)) return 'documentation';
  if (/\.(json|ya?ml|toml|rules|toon|properties)$|(^|\/)(\.[\w-]*ignore|Dockerfile(?:\.[\w-]+)?)$/.test(file)) return 'configuration';
  if (/\.(js|jsx|ts|tsx|mjs|cjs|py|sql|prisma|kt|kts|swift|ps1|sh|css|html)$/.test(file)) return 'source';
  return 'asset-or-reference';
}

export function privatePath(file) {
  const name = path.posix.basename(file);
  return ((/^\.env(?:\.|$)/.test(name) || /\.env$/.test(name)) && name !== '.env.example' && file !== 'growthtrack-ultimate/.env.test')
    || /(^|\/)(node_modules|\.next|\.code-index|coverage|\.venv|secrets|\.secrets|\.aws|\.ssh)(\/|$)/.test(file)
    || /^(?:credentials(?:-[^/]*)?|service-account[^/]*|serviceAccountKey[^/]*|firebase-adminsdk[^/]*)\.json$/i.test(name)
    || /^(?:secrets|.*-key)\.json$/i.test(name)
    || /(^|\/)config\/keys\.json$/i.test(file)
    || /(^|\/)\.streamlit\/secrets\.toml$/i.test(file)
    || /\.(db(?:-wal|-shm|-journal|\.enc(?:\.json)?)?|sqlite3?|pem|key|p12|pfx|tsbuildinfo|log)$/i.test(name);
}

export function relativeLinks(text) {
  const prose = text.replace(/```[^\n]*\n[\s\S]*?```/g, '');
  return [...prose.matchAll(/\[[^\]\n]+\]\((<[^>]+>|[^)\s]+)(?:\s+"[^"]*")?\)/g), ...prose.matchAll(/^\s{0,3}\[[^\]\n]+\]:\s*(<[^>]+>|\S+)/gm)]
    .map(match => match[1].replace(/^<|>$/g, '').split('#')[0].split('?')[0])
    .filter(target => target && !/^[a-z][a-z\d+.-]*:/i.test(target))
    .map(target => { try { return decodeURIComponent(target); } catch { return target; } });
}

export function audit() {
  const files = [...new Set(git(['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean))]
    .filter(file => fs.existsSync(path.join(root, file))).sort();
  const report = { scope: 'File ownership, configuration syntax, local links and packaging boundaries; not complete semantic or security certification.', files: files.length, kinds: {}, extensions: {}, owners: {}, validated: { json: 0, jsonc: 0, yaml: 0, toon: 0, markdown: 0 }, errors: [], historicalReferences: [], inventory: [] };
  const error = (file, rule) => report.errors.push({ file, rule });
  for (const file of files) {
    const top = file.split('/')[0], kind = classify(file);
    const owner = file.includes('/') ? policy.owners[top] : policy.rootFiles.includes(file) ? 'Workspace' : null;
    report.kinds[kind] = (report.kinds[kind] || 0) + 1;
    const extension = path.posix.extname(file) || '(no extension)';
    report.extensions[extension] = (report.extensions[extension] || 0) + 1;
    report.owners[owner || 'unassigned'] = (report.owners[owner || 'unassigned'] || 0) + 1;
    report.inventory.push({ file, owner, kind });
    if (!owner) error(file, 'Unassigned location: add an explicit owner or place this file in its owner directory.');
    if (privatePath(file)) { error(file, 'Private/runtime file is eligible for version control; content was not read.'); continue; }
    if (fs.lstatSync(path.join(root, file)).isSymbolicLink()) { error(file, 'Review symbolic-link targets explicitly before reading their contents.'); continue; }
    if (['agent-reference', 'provenance', 'asset-or-reference'].includes(kind)) continue;
    if (extension === '.json' || extension === '.toon' || /\.ya?ml$/.test(file)) {
      const bytes = fs.readFileSync(path.join(root, file));
      if (bytes[0] === 255 && bytes[1] === 254) { error(file, 'Configuration must use UTF-8, not UTF-16.'); continue; }
      const text = bytes.toString('utf8').replace(/^\uFEFF/, '');
      try {
        if (/^tsconfig(?:\.[^/]+)?\.json$/.test(path.posix.basename(file))) {
          if (ts.parseConfigFileTextToJson(file, text).error) throw new Error('jsonc');
          report.validated.jsonc++;
        } else if (extension === '.json') { JSON.parse(text); report.validated.json++; }
        else if (extension === '.toon') { decodeToon(text); report.validated.toon++; }
        else { yaml.loadAll(text); report.validated.yaml++; }
      } catch { error(file, `Invalid ${extension === '.json' ? 'JSON/JSONC' : extension === '.toon' ? 'TOON' : 'YAML'} syntax; diagnostic values withheld.`); }
    }
    if (extension === '.md') {
      report.validated.markdown++;
      const text = fs.readFileSync(path.join(root, file), 'utf8');
      const base = policy.templateBases[file] || path.posix.dirname(file);
      for (const target of relativeLinks(text)) {
        const destination = path.resolve(root, base, target);
        if (!destination.startsWith(root + path.sep) && destination !== root) { error(file, 'Documentation link escapes the workspace.'); continue; }
        if (!fs.existsSync(destination)) {
          error(file, `Missing relative link: ${target}`);
        }
      }
    }
  }
  for (const file of policy.canonicalDocs) if (!fs.existsSync(path.join(root, file))) error(file, 'Canonical documentation is missing.');
  for (const context of policy.dockerContexts) {
    const file = `${context}/.dockerignore`;
    const lines = fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/).map(line => line.trim()) : [];
    for (const exclusion of policy.dockerExclusions) if (!lines.includes(exclusion)) error(file, `Missing container-context exclusion: ${exclusion}`);
    if (dockerBoundaryReopened(lines, policy.dockerExclusions)) error(file, 'A negation after private-file exclusions can reopen protected build inputs.');
  }
  const probes = ['.env', 'FinSync/apps/web/.env.local', 'Forex/.env', 'growthtrack-ultimate/local.db', '.code-index/probe.json', '.tmp-architecture-check.json', 'Forex/credentials.json', 'FinSync/service-account-prod.json', 'Forex/.streamlit/secrets.toml', '.secrets/client.json'];
  let ignored = new Set();
  try { ignored = new Set(execFileSync('git', ['check-ignore', '--no-index', '--stdin'], { cwd: root, input: probes.join('\n') + '\n', encoding: 'utf8' }).trim().split(/\r?\n/)); }
  catch (failure) { if (failure.status !== 1) throw failure; }
  for (const probe of probes) if (!ignored.has(probe)) error('.gitignore', `Local-file ignore regression: ${probe}`);
  const sourceProbes = [...policy.dockerContexts.map(context => `${context}/.dockerignore`), 'growthtrack-ultimate/build/serviceWorkerPlugin.js', 'growthtrack-ultimate/build/staticCompressionPlugin.js', ...files.filter(file => path.posix.basename(file) === '.env.example')];
  let hiddenSource = [];
  try { hiddenSource = execFileSync('git', ['check-ignore', '--no-index', '--stdin'], { cwd: root, input: sourceProbes.join('\n') + '\n', encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean); }
  catch (failure) { if (failure.status !== 1) throw failure; }
  for (const file of hiddenSource) error(file, 'Required source configuration is hidden by Git ignore rules.');
  try {
    const evidence = checkEvidence();
    report.evidence = { references: evidence.references.length, artifacts: evidence.artifacts.length, unavailable: evidence.artifacts.filter(item => item.status === 'unavailable').length };
  } catch { error('docs/evidence/artifacts.toon', 'Evidence register or generated documentation is inconsistent. Run npm run evidence:check for details.'); }
  return report;
}

export function dockerBoundaryReopened(lines, exclusions) {
  const start = lines.findIndex(line => exclusions.includes(line));
  return start >= 0 && lines.slice(start + 1).some(line => line.startsWith('!'));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = audit();
  const destination = path.join(root, '.code-index/repository-audit.json');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ files: report.files, kinds: report.kinds, validated: report.validated, errors: report.errors, historicalReferences: report.historicalReferences.length, evidence: report.evidence, report: '.code-index/repository-audit.json', scope: report.scope }, null, 2));
  if (report.errors.length && process.argv.includes('--check')) process.exitCode = 1;
}
