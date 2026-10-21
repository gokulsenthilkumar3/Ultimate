// Reads facts out of the app's source text (no bundler needed) so the plan can be checked against the real code.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = resolve(here, '../../..');

const read = (relative) => readFileSync(resolve(APP_ROOT, relative), 'utf8');

/** Every metric key and profile field name the app already uses for a body measurement. */
export function existingMetricNames() {
  const names = new Set();
  const profile = read('src/lib/physiqueProfile.js');
  for (const m of profile.matchAll(/\bkey:\s*'([A-Za-z_]+)'/g)) names.add(m[1]);
  for (const m of profile.matchAll(/\b(?:currentField|targetField):\s*'([A-Za-z_]+)'/g)) names.add(m[1]);
  const ranges = read('src/components/morphEngine/metricsToBlendshapes.js');
  const block = ranges.match(/MORPH_RANGES = Object\.freeze\(\{([\s\S]*?)\n\}\);/);
  if (block) for (const m of block[1].matchAll(/^\s*([A-Za-z_]+):\s*\{/gm)) names.add(m[1]);
  for (const file of ['src/lib/bodyMetricContract.js', 'src/lib/bodyMeasurementDefinitions.js']) {
    for (const m of read(file).matchAll(/\b([A-Za-z]+(?:Cm|Kg|Pct|Deg))\b|\b([a-z][A-Za-z]+):\s*\{\s*min/g)) names.add(m[1] || m[2]);
  }
  return names;
}

/** Region names the viewer can select (src/components/morphEngine/bodyRegions.js). */
export function viewerRegionNames() {
  const text = read('src/components/morphEngine/bodyRegions.js');
  return new Set([...text.matchAll(/\bname:\s*["']([A-Za-z]+)["']/g)].map((m) => m[1]));
}

export function wardrobePresets() {
  const text = read('src/store/use3DStore.js');
  const block = text.match(/WARDROBE_PRESETS\s*=\s*\{([\s\S]*?)\n\};/);
  return block ? [...block[1].matchAll(/^\s*([A-Z_]+):/gm)].map((m) => m[1]) : [];
}

export function cameraPresets() {
  const text = read('src/store/use3DStore.js');
  const block = text.match(/CAMERA_PRESETS\s*=\s*\{([\s\S]*?)\n\};/);
  return block ? [...block[1].matchAll(/^\s*([A-Z_]+):/gm)].map((m) => m[1]) : [];
}

/** Avatar appearance fields documented in the 3D store's typedef (skinTone, eyeColor, hairColor, ...). */
export function appearanceFields() {
  const text = read('src/store/use3DStore.js');
  return new Set([...text.matchAll(/@property\s+\{[^}]+\}\s+([A-Za-z_]+)/g)].map((m) => m[1]));
}

/** Parts the GLB audit found (docs/real-human-3d/data/glb-audit.humanoid-base.json). */
export function auditCatalogue() {
  return JSON.parse(readFileSync(resolve(APP_ROOT, 'docs/real-human-3d/data/glb-audit.humanoid-base.json'), 'utf8')).catalogue;
}
