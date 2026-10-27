import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const provenancePath = 'public/assets/models/ASSET-PROVENANCE.json';
const provenance = JSON.parse(await readFile(provenancePath, 'utf8'));
const tissueText = await readFile('src/config/parametricTissue.json', 'utf8');
const tissue = JSON.parse(tissueText);
const eyeManifestPath = 'public/assets/parametric/eyes/manifest.json';
const eyes = JSON.parse(await readFile(eyeManifestPath, 'utf8'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
if (JSON.stringify(JSON.parse(await readFile('public/assets/parametric/skin/thickness-manifest.json', 'utf8'))) !== JSON.stringify(tissue)) throw new Error('The bundled tissue manifest differs from the runtime manifest.');
const candidates = [
  ...Object.values(tissue.maps).map(file => ({ path: `public/${file.path}`, hash: file.sha256, tissue: true })),
  { path: 'public/assets/parametric/skin/thickness-manifest.json', tissue: true },
  { path: `public/assets/parametric/eyes/${eyes.albedo.file}`, hash: eyes.albedo.sha256 },
  { path: eyeManifestPath },
];
const entries = [];
for (const file of candidates) {
  const bytes = await readFile(file.path), hash = digest(bytes);
  if (file.hash && hash !== file.hash) throw new Error(`${file.path}: manifest hash mismatch.`);
  entries.push({ path: file.path, sha256: hash,
    builtBy: `node scripts/parametric-portrait/build-${file.tissue ? 'thickness' : 'eyes'}.mjs`,
    components: [{ name: file.tissue ? 'Canonical skin local diffusion prototype' : 'Canonical layered eye atlas',
      source: file.tissue ? 'Project-generated neutral geometry chord thickness and independently implemented diffusion lookup; see thickness-SOURCE.md. Not measured physiological skin data.' : `MakeHuman CC0 system assets archive ${eyes.sourceArchiveSha256}; archived source notices in public/assets/parametric/eyes/.`,
      licence: file.tissue ? 'Project-authored' : 'CC0-1.0 source assets; project-authored geometry and metadata.',
      modified: file.tissue || file.path.endsWith('.json'), status: file.tissue ? 'project' : 'verified', reviewed: '2026-10-27' }],
  });
}
const paths = new Set(entries.map(entry => entry.path));
provenance.assets = [...provenance.assets.filter(entry => !paths.has(entry.path)), ...entries];
provenance.updated = '2026-10-27';
await writeFile(provenancePath, JSON.stringify(provenance, null, 2) + '\n');
console.log(`Recorded ${entries.length} portrait prototype assets; preserved other entries.`);
