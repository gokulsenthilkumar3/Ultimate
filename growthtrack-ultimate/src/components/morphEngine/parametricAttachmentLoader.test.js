import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { Texture, TextureLoader } from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const assetDirectory = 'public/assets/parametric/attachments/';
const manifest = JSON.parse(readFileSync(`${assetDirectory}manifest.json`, 'utf8'));
const files = new Map(Object.values(manifest.assets).flatMap(entry => [
  entry.file, entry.notice, entry.textures.albedo.file, entry.textures.normal.file,
]).map(file => [file, readFileSync(`${assetDirectory}${file}`)]));

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const nextTurn = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal('fetch', vi.fn(async url => {
    const name = String(url).split('/').at(-1);
    if (name === 'manifest.json') return { ok: true, json: async () => structuredClone(manifest) };
    const bytes = files.get(name);
    if (!bytes) throw new Error(`Unexpected fixture request: ${name}`);
    return { ok: true, arrayBuffer: async () => Uint8Array.from(bytes).buffer };
  }));
  let nextUrl = 0;
  class FixtureURL extends URL {}
  FixtureURL.createObjectURL = vi.fn(() => `blob:attachment-fixture-${++nextUrl}`);
  FixtureURL.revokeObjectURL = vi.fn();
  vi.stubGlobal('URL', FixtureURL);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('finishes delayed sibling loads before rejecting, releases their textures, and permits a clean retry', async () => {
  const pending = [];
  const loadTexture = vi.spyOn(TextureLoader.prototype, 'loadAsync').mockImplementation(url => {
    const task = { ...deferred(), url };
    pending.push(task);
    return task.promise;
  });
  const { loadParametricAttachmentAssets } = await import('./parametricAttachments.js');
  let settled = false;
  const result = loadParametricAttachmentAssets().then(
    value => { settled = true; return { value }; },
    error => { settled = true; return { error }; },
  );
  await vi.waitFor(() => expect(pending).toHaveLength(4));

  const failure = new Error('The image could not be decoded');
  pending[0].reject(failure);
  await nextTurn();
  expect(settled).toBe(false);

  const completed = pending.slice(1).map(() => {
    const texture = new Texture();
    vi.spyOn(texture, 'dispose');
    return texture;
  });
  // The failed map's sibling and the other attachment can finish separately.
  // Neither may create a texture after the public failure/cleanup completes.
  pending[1].resolve(completed[0]);
  await nextTurn();
  expect(settled).toBe(false);
  pending[2].resolve(completed[1]);
  await nextTurn();
  expect(settled).toBe(false);
  pending[3].resolve(completed[2]);
  expect((await result).error).toBe(failure);
  for (const texture of completed) expect(texture.dispose).toHaveBeenCalledTimes(1);
  expect(new Set(URL.revokeObjectURL.mock.calls.map(([url]) => url)))
    .toEqual(new Set(pending.map(task => task.url)));

  const fresh = [];
  loadTexture.mockImplementation(async () => {
    const texture = new Texture();
    vi.spyOn(texture, 'dispose'); fresh.push(texture);
    return texture;
  });
  const retried = await loadParametricAttachmentAssets();
  expect(retried.manifest).toEqual(manifest);
  expect(retried.hair.data.name).toBe('short02');
  expect(retried.garment.data.name).toBe('tee');
  expect(fresh).toHaveLength(4);
  expect([retried.hair.albedo, retried.hair.normal, retried.garment.albedo, retried.garment.normal])
    .toEqual(expect.arrayContaining(fresh));
  for (const texture of fresh) expect(texture.dispose).not.toHaveBeenCalled();
  expect(await loadParametricAttachmentAssets()).toBe(retried);
});
