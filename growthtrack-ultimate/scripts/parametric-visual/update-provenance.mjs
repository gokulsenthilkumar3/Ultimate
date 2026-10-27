import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';

const root = 'public/assets/parametric';
const manifestPath = 'public/assets/models/ASSET-PROVENANCE.json';
const provenance = JSON.parse(await readFile(manifestPath, 'utf8'));
const skin = JSON.parse(await readFile(`${root}/skin/manifest.json`, 'utf8'));
const attachments = JSON.parse(await readFile(`${root}/attachments/manifest.json`, 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const entries = [];
for (const folder of ['skin', 'attachments']) {
  for (const file of await readdir(`${root}/${folder}`)) {
    if (!/\.(png|json)$/.test(file)) continue;
    const path = `${root}/${folder}/${file}`;
    const bytes = await readFile(path);
    const expected = folder === 'skin'
      ? Object.values(skin.maps).find(map => `public/${map.path}` === path)?.sha256
      : Object.values(attachments.assets).flatMap(asset => [{ file: asset.file, sha256: asset.sha256 }, ...Object.values(asset.textures)]).find(asset => asset.file === file)?.sha256;
    if (expected && sha(bytes) !== expected) throw new Error(`${path}: content differs from its reviewed asset manifest.`);
    const estimated = folder === 'skin' && !['albedo.png', 'manifest.json'].includes(file);
    entries.push({
      path, sha256: sha(bytes),
      builtBy: `node scripts/parametric-visual/build-${folder === 'skin' ? 'skin-assets' : 'attachments'}.mjs`,
      components: [{
        name: folder === 'skin' ? `Canonical skin ${file}` : `Canonical attachment ${file}`,
        source: estimated
          ? 'Project-generated regional roughness/scattering bake or seeded pore tile; see public/assets/parametric/skin/manifest.json. Not measured tissue data.'
          : `MakeHuman CC0 system assets archive b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107; hash records and archived source notices in ${root}/${folder}/manifest.json.`,
        licence: estimated ? 'Project-authored' : 'CC0-1.0 source assets; project-authored binding/map metadata. Archived source headers and CC0 text accompany editable exports.',
        modified: file.endsWith('.json'), status: estimated ? 'project' : 'verified', reviewed: '2026-10-26',
      }],
    });
  }
}
const replaced = new Set(entries.map(entry => entry.path));
provenance.assets = [...provenance.assets.filter(entry => !replaced.has(entry.path)), ...entries];
provenance.updated = '2026-10-26';
await writeFile(manifestPath, JSON.stringify(provenance, null, 2) + '\n');
console.log(`Recorded ${entries.length} canonical visual assets without changing other provenance entries.`);
