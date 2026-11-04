/** Local, bounded source retrieval. No network, model, database or credentials. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadExclusions } from './code-index-policy.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX_DIR = path.join(ROOT, '.code-index');
const INDEX_PATH = path.join(INDEX_DIR, 'source.json');
const EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.css', '.scss', '.prisma', '.md']);
const ROOT_FILES = new Set(['README.md', 'WORKSPACE.md', 'AGENTS.md', 'growthtrack-ultimate/server.js']);
const SOURCE_ROOTS = ['growthtrack-ultimate/src/', 'growthtrack-ultimate/server/', 'growthtrack-ultimate/scripts/', 'growthtrack-ultimate/prisma/', 'FinSync/apps/', 'FinSync/packages/', 'FinSync/OxFin/ox-fin-web/src/', 'FinSync/OxFin/services/', 'Equity/NiftyLens/src/', 'Family Connect/familyconnect/frontend/src/', 'Family Connect/familyconnect/backend/src/', 'Forex/src/', 'Forex/app/', 'scripts/', 'tests/', 'docs/plans/'];
const exclusions = loadExclusions(path.join(ROOT, '.codeindexignore'));
const hash = text => crypto.createHash('sha256').update(text).digest('hex');

export function isIndexable(file) {
  const name = file.replace(/\\/g, '/');
  if (path.isAbsolute(name) || name.split('/').includes('..')) return false;
  if (!EXTENSIONS.has(path.posix.extname(name).toLowerCase())) return false;
  if (/(^|\/)(\.env[^/]*|[^/]*\.env|[^/]*credentials?[^/]*|service[-_]?account[^/]*|secrets?)(\/|\.|$)/i.test(name)) return false;
  if (exclusions.some(part => `/${name}/`.includes(`/${part}/`))) return false;
  if (!ROOT_FILES.has(name) && !name.endsWith('/README.md') && !SOURCE_ROOTS.some(prefix => name.startsWith(prefix))) return false;
  return true;
}
export function redactSource(text) {
  return text.split(/\r?\n/).map(line => {
    // Redact credential-looking tokens and literal secret assignments. Preserve line numbers.
    if (/(?:sk-(?:proj-)?[a-zA-Z0-9_-]{12,}|AIza[\w-]{20,}|AKIA[A-Z0-9]{16}|gh[pousr]_[\w]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(line)) return '[redacted: possible embedded credential]';
    if (/(?:secret|password|privateKey|apiKey|accessToken|refreshToken|encryptionKey)\s*[:=]\s*['"][^'"]+['"]/i.test(line)) return '[redacted: literal credential assignment]';
    return line;
  }).join('\n');
}
export function tokenize(text) {
  return text.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().match(/[a-z0-9_]{2,}/g) || [];
}
export function chunkSource(file, source) {
  const safe = redactSource(source); const lines = safe.split('\n'); const chunks = [];
  // Bounded overlapping windows retain neighbouring imports and function context.
  for (let start = 0; start < lines.length;) {
    let end = Math.min(lines.length, start + 72);
    while (end > start + 1 && lines.slice(start, end).join('\n').length > 4400) end -= 1;
    const content = lines.slice(start, end).map(line => line.slice(0, 1600)).join('\n').slice(0, 4400);
    const symbols = [...content.matchAll(/(?:function|class|interface|type|def)\s+(\w+)|(?:export\s+)?(?:const|let)\s+(\w+)\s*=/g)].map(m => m[1] || m[2]);
    if (content.trim()) chunks.push({ id: hash(`${file}:${start + 1}:${content}`).slice(0, 20), file, start: start + 1, end, symbols: symbols.slice(0, 18), content });
    if (end >= lines.length) break;
    start = Math.max(start + 1, end - 8);
  }
  return chunks;
}
export function sourceFiles() {
  const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }).split('\0').filter(Boolean);
  return [...new Set(tracked)].filter(isIndexable).sort();
}
export function buildIndex() {
  const chunks = []; const files = {};
  for (const file of sourceFiles()) {
    const absolute = path.resolve(ROOT, file);
    if (!absolute.startsWith(ROOT + path.sep) || !fs.existsSync(absolute)) continue;
    const stat = fs.lstatSync(absolute); if (!stat.isFile() || stat.size > 250000) continue;
    const source = fs.readFileSync(absolute, 'utf8'); if (source.includes('\0')) continue;
    files[file] = hash(source); chunks.push(...chunkSource(file, source));
  }
  fs.mkdirSync(INDEX_DIR, { recursive: true });
  const result = { version: 1, generatedAt: new Date().toISOString(), mode: 'local-lexical', exclusionsHash: hash(exclusions.join('\n')), files, chunks };
  fs.writeFileSync(INDEX_PATH + '.tmp', JSON.stringify(result)); fs.renameSync(INDEX_PATH + '.tmp', INDEX_PATH);
  return result;
}
export function searchIndex(index, query, { limit = 5, maxChars = 12000 } = {}) {
  const terms = [...new Set(tokenize(query))]; if (!terms.length) return [];
  const identifiers = new Set((query.match(/[a-zA-Z_$][\w$]*/g) || []).map(term => term.toLowerCase()));
  const docs = index.chunks.map(chunk => ({ chunk, terms: tokenize(`${chunk.file} ${chunk.symbols.join(' ')} ${chunk.content}`) }));
  const df = Object.fromEntries(terms.map(term => [term, docs.filter(doc => doc.terms.includes(term)).length]));
  const ranked = docs.map(({ chunk, terms: words }) => {
    let score = 0;
    for (const term of terms) {
      const count = words.filter(word => word === term).length;
      if (!count) continue;
      score += Math.log(1 + (docs.length + .5) / (df[term] + .5)) * (count * 2.2 / (count + 1.2 * (.25 + .75 * words.length / 500)));
      if (chunk.file.toLowerCase().includes(term)) score += 2;
      if (chunk.symbols.some(symbol => symbol.toLowerCase() === term)) score += 5;
    }
    if (chunk.symbols.some(symbol => identifiers.has(symbol.toLowerCase()))) score += 35;
    return { ...chunk, score: Math.round(score * 100) / 100 };
  }).filter(chunk => chunk.score > 0).sort((a, b) => b.score - a.score);
  const selected = []; const fileCounts = {}; let used = 0;
  for (const chunk of ranked) {
    if (selected.length >= Math.max(1, Math.min(12, limit))) break;
    if ((fileCounts[chunk.file] || 0) >= 2) continue;
    const remaining = Math.min(24000, maxChars) - used; if (remaining < 300) break;
    const content = chunk.content.slice(0, remaining); selected.push({ ...chunk, content }); used += content.length;
    fileCounts[chunk.file] = (fileCounts[chunk.file] || 0) + 1;
  }
  return selected;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'index') {
    const result = buildIndex(); console.log(`Local index: ${Object.keys(result.files).length} files, ${result.chunks.length} chunks. Stored in ignored .code-index/. No network requests.`);
  } else if (command === 'search' && args.length) {
    if (!fs.existsSync(INDEX_PATH)) throw new Error('Run npm run context:index first.');
    const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
    if (index.exclusionsHash !== hash(exclusions.join('\n'))) throw new Error('Index exclusions changed. Run npm run context:index.');
    const results = searchIndex(index, args.join(' '));
    for (const result of results) {
      const current = fs.readFileSync(path.join(ROOT, result.file), 'utf8');
      if (hash(current) !== index.files[result.file]) throw new Error(`Stale index for ${result.file}. Run npm run context:index.`);
      console.log(`\n${result.file}:${result.start}-${result.end} · score ${result.score}\n${result.content}`);
    }
    if (!results.length) console.log('No matches. Try an exact symbol or a product name.');
  } else { console.log('Usage: node scripts/code-context.mjs index | search <question or symbol>'); process.exitCode = 1; }
}
