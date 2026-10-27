import { readFileSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import { LinearFilter, NoColorSpace, SRGBColorSpace, Texture, TextureLoader } from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import skin from '../../config/parametricSkin.json';
import tissue from '../../config/parametricTissue.json';

const maps = { ...skin.maps, ...tissue.maps };
const notices = [...skin.licenseFiles, ...tissue.licenseFiles];
const files = new Map([...Object.values(maps), ...notices].map(file => [file.path, readFileSync(`public/${file.path}`)]));
let blobs, textures;
beforeEach(() => {
  vi.resetModules(); vi.stubGlobal('crypto', webcrypto);
  textures = []; blobs = new Map();
  vi.stubGlobal('fetch', vi.fn(async url => {
    const file = files.get(String(url).replace(/^\//, ''));
    if (!file) throw new Error(`Unexpected asset request: ${url}`);
    return { ok: true, arrayBuffer: async () => Uint8Array.from(file).buffer };
  }));
  class FixtureURL extends URL {}
  FixtureURL.createObjectURL = vi.fn(blob => { const url = `blob:skin-${blobs.size}`; blobs.set(url, blob); return url; });
  FixtureURL.revokeObjectURL = vi.fn(); vi.stubGlobal('URL', FixtureURL);
  vi.spyOn(TextureLoader.prototype, 'loadAsync').mockImplementation(async url => {
    const hash = createHash('sha256').update(Buffer.from(await blobs.get(url).arrayBuffer())).digest('hex');
    const file = Object.values(maps).find(map => map.sha256 === hash);
    const texture = new Texture({ width: file.width, height: file.height });
    vi.spyOn(texture, 'dispose'); textures.push(texture); return texture;
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('loads six verified maps with linear unmipped diffusion lookup sampling and accompanying notices', async () => {
  const { loadParametricSkinAssets, loadParametricSkinNotices } = await import('./parametricVisualAssets');
  const pack = await loadParametricSkinAssets();
  expect(Object.keys(pack.textures).sort()).toEqual(Object.keys(maps).sort());
  expect(pack.tissueManifest).toEqual(tissue);
  expect(pack.textures.albedo.colorSpace).toBe(SRGBColorSpace);
  expect(pack.textures.thickness.colorSpace).toBe(NoColorSpace);
  expect(pack.textures.diffusionLut.generateMipmaps).toBe(false);
  expect(pack.textures.diffusionLut.minFilter).toBe(LinearFilter);
  expect(pack.textures.normal.repeat.toArray()).toEqual([64, 64]);
  expect(await loadParametricSkinAssets()).toBe(pack);
  expect(await loadParametricSkinNotices()).toHaveProperty('thickness-SOURCE.md');
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(6);
  textures.forEach(texture => expect(texture.dispose).not.toHaveBeenCalled());
});

it('releases decoded sibling textures after a corrupt map and permits a verified retry', async () => {
  const validFetch = fetch;
  vi.stubGlobal('fetch', vi.fn(async url => String(url).endsWith('thickness.png')
    ? { ok: true, arrayBuffer: async () => new ArrayBuffer(3) } : validFetch(url)));
  const { loadParametricSkinAssets } = await import('./parametricVisualAssets');
  await expect(loadParametricSkinAssets()).rejects.toThrow(/recorded version/);
  expect(textures).toHaveLength(5);
  textures.forEach(texture => expect(texture.dispose).toHaveBeenCalledTimes(1));
  vi.stubGlobal('fetch', validFetch);
  expect(Object.keys((await loadParametricSkinAssets()).textures)).toHaveLength(6);
});
