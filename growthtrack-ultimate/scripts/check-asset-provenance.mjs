import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Every shipped 3D asset must be listed in public/assets/models/ASSET-PROVENANCE.json
// with a matching sha256 and per-component licence status. Ordinary CI fails on
// missing, stale or malformed entries; --release also fails on unresolved licences.

export const MANIFEST = 'public/assets/models/ASSET-PROVENANCE.json';
const ASSET_EXTENSIONS = new Set(['.glb', '.gltf', '.bin', '.ktx2', '.hdr', '.exr', '.fbx', '.obj', '.mhclo', '.mhmat', '.usdz']);
const TEXTURE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.ktx2']);
const STATUSES = new Set(['project', 'verified', 'unresolved']);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(entries.map(entry => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  }));
  return files.flat();
}

/** Files that must carry provenance: 3D formats anywhere under public/, and
    every texture-like file under public/assets/models/. */
export async function shippedAssets(root) {
  const publicDir = path.join(root, 'public');
  const modelsDir = path.join(publicDir, 'assets', 'models');
  const wardrobeDir = path.join(publicDir, 'assets', 'wardrobe');
  const parametricDir = path.join(publicDir, 'assets', 'parametric');
  return (await walk(publicDir))
    .filter(file => {
      const extension = path.extname(file).toLowerCase();
      return ASSET_EXTENSIONS.has(extension)
        || (TEXTURE_EXTENSIONS.has(extension) && [modelsDir, wardrobeDir, parametricDir].some(folder => file.startsWith(folder + path.sep)))
        || (extension === '.json' && [path.join(parametricDir, 'skin'), path.join(parametricDir, 'attachments')].some(folder => file.startsWith(folder + path.sep)));
    })
    .map(file => path.relative(root, file).split(path.sep).join('/'))
    .sort();
}

const sha256 = async file => createHash('sha256').update(await readFile(file)).digest('hex');

export async function checkAssetProvenance({ root, release = false } = {}) {
  const errors = [];
  const warnings = [];
  let manifest;
  try { manifest = JSON.parse(await readFile(path.join(root, MANIFEST), 'utf8')); }
  catch (error) { return { ok: false, errors: [`${MANIFEST}: ${error.code === 'ENOENT' ? 'missing' : 'not valid JSON'}`], warnings }; }
  const entries = new Map((Array.isArray(manifest.assets) ? manifest.assets : []).map(entry => [entry.path, entry]));
  if (!Array.isArray(manifest.assets)) errors.push(`${MANIFEST}: "assets" must be a list.`);
  if([...entries.values()].some(entry=>entry.sourceAsset) && (!Array.isArray(manifest.licenseEvidence) || !manifest.licenseEvidence.length))errors.push('Derivative assets require archived licence evidence.');

  if(manifest.licenseEvidence!=null && !Array.isArray(manifest.licenseEvidence))errors.push('Licence evidence must be a list.');
  for(const evidence of Array.isArray(manifest.licenseEvidence)?manifest.licenseEvidence:[]) {
    if(!evidence || typeof evidence.path!=='string' || !evidence.path || path.isAbsolute(evidence.path) || evidence.path.split(/[\\/]/).includes('..')) {errors.push('Licence evidence needs a repository-relative path.');continue;}
    try {
      // Git may check text files out with CRLF; licence evidence hashes the
      // archived upstream UTF-8 text with LF line endings.
      const bytes=Buffer.from((await readFile(path.join(root,evidence.path),'utf8')).replace(/\r\n/g,'\n'));
      const actual=createHash('sha256').update(bytes).digest('hex');
      if(actual!==evidence.sha256)errors.push(`${evidence.path}: licence evidence hash mismatch.`);
      if(evidence.gitBlobSha1 && createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')!==evidence.gitBlobSha1)errors.push(`${evidence.path}: pinned upstream git blob mismatch.`);
    } catch {errors.push(`${evidence.path}: licence evidence missing or unreadable.`);}
  }

  const componentsOf = entry => entry.sameComponentsAs ? entries.get(entry.sameComponentsAs)?.components : entry.components;
  for (const file of await shippedAssets(root)) {
    const entry = entries.get(file);
    if (!entry) { errors.push(`${file}: no provenance entry.`); continue; }
    const actual = await sha256(path.join(root, file));
    if (entry.sha256 !== actual) errors.push(`${file}: sha256 ${actual} does not match the recorded ${entry.sha256 || '(none)'}. Update the entry after reviewing the change.`);
    if(entry.sourceAsset && (!entries.has(entry.sourceAsset) || entries.get(entry.sourceAsset).sha256!==entry.sourceSha256))errors.push(`${file}: source asset hash does not match its provenance.`);
    const components = componentsOf(entry);
    if (!Array.isArray(components) || !components.length) { errors.push(`${file}: no components listed${entry.sameComponentsAs ? ` (sameComponentsAs ${entry.sameComponentsAs} not found)` : ''}.`); continue; }
    components.forEach((component, index) => {
      const label = `${file} component ${index + 1}${component?.name ? ` (${component.name})` : ''}`;
      for (const field of ['name', 'source', 'licence', 'status']) if (!component?.[field]) errors.push(`${label}: missing ${field}.`);
      if (component?.status && !STATUSES.has(component.status)) errors.push(`${label}: status must be project, verified or unresolved.`);
      if (component?.status === 'unresolved') (release ? errors : warnings).push(`${label}: licence unresolved — ${component.licence}.`);
    });
  }
  for (const listed of entries.keys()) {
    if (!(await readFile(path.join(root, listed)).then(() => true, () => false))) errors.push(`${listed}: listed in the manifest but not found.`);
  }
  return { ok: errors.length === 0, errors, warnings };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--release')) throw new Error('Usage: node scripts/check-asset-provenance.mjs [--release]');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const result = await checkAssetProvenance({ root, release: args.includes('--release') });
  for (const warning of result.warnings) console.warn(`warning: ${warning}`);
  for (const error of result.errors) console.error(`error: ${error}`);
  console.log(result.ok ? `Asset provenance OK${result.warnings.length ? ` (${result.warnings.length} unresolved licence warnings)` : ''}.` : `Asset provenance check failed with ${result.errors.length} error(s).`);
  process.exitCode = result.ok ? 0 : 1;
}
