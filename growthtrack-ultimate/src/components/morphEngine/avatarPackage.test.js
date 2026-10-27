import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { zipSync, unzipSync, strToU8 } from 'three/addons/libs/fflate.module.js';
import { createAvatarDocument } from '../../lib/avatarDocument.js';
import { avatarSha256, exportAvatarPackage, importAvatarPackage, validatePackageGlb } from './avatarPackage.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ZipBytes = strToU8('', true).constructor;
const zip = (entries, options = { level: 0 }) => zipSync(Object.fromEntries(Object.entries(entries).map(([name, content]) => [name, new ZipBytes(content)])), options);

function glb(overrides = {}) {
  let text = JSON.stringify({ asset: { version: '2.0' }, ...overrides });
  text += ' '.repeat((4 - encoder.encode(text).length % 4) % 4);
  const chunk = encoder.encode(text);
  const result = new Uint8Array(20 + chunk.length);
  const view = new DataView(result.buffer);
  view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true); view.setUint32(8, result.length, true);
  view.setUint32(12, chunk.length, true); view.setUint32(16, 0x4e4f534a, true); result.set(chunk, 20);
  return result;
}
async function fixture() {
  const basis = glb({ extras: { role: 'canonical-basis' } });
  const asset = { family: 'test-canonical', sourceRevision: 'abc123', topologyHash: 'canonical-order-v1', rigVersion: 'rig-v1', lod: 'editor', sourceHash: await avatarSha256(basis) };
  const document = createAvatarDocument({ asset, id: 'person-1', createdAt: '2026-10-26T12:00:00.000Z', current: { parameters: { noseWidth: 0.2 }, appearance: { skinColor: '#d09070' } }, goal: { parameters: { noseWidth: 0.8 } } });
  return { document, glb: glb(), basis, licenseFiles: { 'CC0.txt': 'CC0 source fixture notice' }, licenseReferences: [{ label: 'Source', url: 'https://example.com/source', license: 'CC0-1.0' }] };
}
function repack(data, mutate) { const entries = unzipSync(data); mutate(entries); return zip(entries); }

describe('portable editable avatar package', () => {
  beforeEach(() => { vi.stubGlobal('crypto', webcrypto); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('round-trips self-contained semantic state, basis, GLB and licence notices', async () => {
    const input = await fixture();
    const result = await importAvatarPackage(await exportAvatarPackage(input), { expectedAsset: input.document.asset });
    expect(result.document).toEqual(input.document);
    expect(result.glb).toEqual(input.glb);
    expect(result.basis).toEqual(input.basis);
    expect(result.licenseFiles['licenses/CC0.txt']).toBe(input.licenseFiles['CC0.txt']);
    expect(result.compatibility).toEqual({ semantic: 'exact-asset-match', basis: 'sha256-verified', externalGeometry: 'not-applied' });
    result.document.contexts.current.parameters.noseWidth = 1;
    expect(result.document.contexts.goal.parameters.noseWidth).toBe(0.8);
    expect(input.document.contexts.current.parameters.noseWidth).toBe(0.2);
  });

  it('labels unknown-family imports instead of claiming restored topology compatibility', async () => {
    const result = await importAvatarPackage(await exportAvatarPackage(await fixture()));
    expect(result.compatibility.semantic).toBe('needs-asset-verification');
    expect(result.compatibility.externalGeometry).toBe('not-applied');
    expect(result.manifest.capabilities).toEqual({ rigFitting: 'unknown', expressionBank: 'unknown', browserSkinScattering: 'unknown', clothing: 'unknown' });
  });

  it('preserves explicit rig, expression, skin and wardrobe limitations in manifest and README', async () => {
    const capabilities = { rigFitting: 'not-performed', expressionBank: 'none', browserSkinScattering: 'not-exported', clothing: 'fitted-shorts-preview' };
    const archive = await exportAvatarPackage({ ...await fixture(), capabilities });
    const result = await importAvatarPackage(archive);
    expect(result.manifest.capabilities).toEqual(capabilities);
    const readme = decoder.decode(unzipSync(archive)['README.txt']);
    expect(readme).toContain('not-performed');
    expect(readme).toContain('not-exported');
    await expect(exportAvatarPackage({ ...await fixture(), capabilities: { rigFitting: true } })).rejects.toThrow(/capability rigFitting/);
    await expect(exportAvatarPackage({ ...await fixture(), capabilities: { photoCapture: 'yes' } })).rejects.toThrow(/capability field/);
  });

  it('reads older v1 manifests without capability declarations conservatively', async () => {
    const archive = await exportAvatarPackage(await fixture());
    const older = repack(archive, entries => {
      const manifest = JSON.parse(decoder.decode(entries['manifest.json']));
      delete manifest.capabilities;
      entries['manifest.json'] = encoder.encode(JSON.stringify(manifest));
    });
    const result = await importAvatarPackage(older);
    expect(result.manifest.capabilities.rigFitting).toBe('unknown');
    expect(result.manifest.capabilities.clothing).toBe('unknown');
    const malformed = repack(archive, entries => {
      const manifest = JSON.parse(decoder.decode(entries['manifest.json']));
      manifest.capabilities.rigFitting = 'guaranteed';
      entries['manifest.json'] = encoder.encode(JSON.stringify(manifest));
    });
    await expect(importAvatarPackage(malformed)).rejects.toThrow(/capability rigFitting/);
  });

  it('rejects mismatched canonical topology or source basis', async () => {
    const input = await fixture();
    const zip = await exportAvatarPackage(input);
    await expect(importAvatarPackage(zip, { expectedAsset: { ...input.document.asset, topologyHash: 'same-vertex-count-different-order' } })).rejects.toThrow(/topologyHash/);
    await expect(exportAvatarPackage({ ...input, basis: glb({ extras: { altered: true } }) })).rejects.toThrow(/sourceHash/);
  });

  it('checks all entry hashes before accepting a document or geometry', async () => {
    const input = await fixture();
    const zip = await exportAvatarPackage(input);
    const damaged = repack(zip, (entries) => { entries['avatar.glb'][entries['avatar.glb'].length - 2] ^= 1; });
    await expect(importAvatarPackage(damaged)).rejects.toThrow(/integrity/);
    const changedDocument = repack(zip, (entries) => { const doc = JSON.parse(decoder.decode(entries['avatar.json'])); doc.contexts.current.parameters.noseWidth = 0.9; entries['avatar.json'] = encoder.encode(JSON.stringify(doc)); });
    await expect(importAvatarPackage(changedDocument)).rejects.toThrow(/integrity/);
  });

  it('rejects unsupported versions, missing authoring basis and unsafe paths', async () => {
    const zip = await exportAvatarPackage(await fixture());
    const future = repack(zip, (entries) => { const manifest = JSON.parse(decoder.decode(entries['manifest.json'])); manifest.schemaVersion = 2; entries['manifest.json'] = encoder.encode(JSON.stringify(manifest)); });
    await expect(importAvatarPackage(future)).rejects.toThrow(/format\/version/);
    const missing = repack(zip, (entries) => { delete entries['basis.glb']; });
    await expect(importAvatarPackage(missing)).rejects.toThrow(/missing/);
    const traversal = repack(zip, (entries) => { entries['../avatar.json'] = encoder.encode('{}'); });
    await expect(importAvatarPackage(traversal)).rejects.toThrow(/unsafe/);
    await expect(exportAvatarPackage({ ...await fixture(), licenseFiles: { '../private.txt': 'secret' } })).rejects.toThrow(/safe/);
  });

  it('rejects compressed entries and oversized declared entry lengths before allocation', async () => {
    const archive = await exportAvatarPackage(await fixture());
    await expect(importAvatarPackage(zip(unzipSync(archive), { level: 6 }))).rejects.toThrow(/STORE/);
    const forged = archive.slice();
    const view = new DataView(forged.buffer);
    let offset = 0;
    while (offset + 46 < forged.length && view.getUint32(offset, true) !== 0x02014b50) offset++;
    view.setUint32(offset + 24, 0xffffffff, true);
    await expect(importAvatarPackage(forged)).rejects.toThrow(/bounded/);
  });

  it('rejects ZIP comments that could redirect the decoder to an unvalidated compressed directory', async () => {
    const archive = await exportAvatarPackage(await fixture());
    const hidden = zip({ 'unvalidated.txt': encoder.encode('x'.repeat(1024 * 1024)) }, { level: 9 });
    const hiddenView = new DataView(hidden.buffer, hidden.byteOffset, hidden.byteLength);
    const hiddenEnd = hidden.length - 22;
    const hiddenDirectory = hiddenView.getUint32(hiddenEnd + 16, true);
    // The actual archive's EOCD declares the nested ZIP as its comment. The
    // nested EOCD has an invalid comment length, so strict preflight skips it
    // while fflate's backwards signature scan would still use its directory.
    hiddenView.setUint32(hiddenDirectory + 42, hiddenView.getUint32(hiddenDirectory + 42, true) + archive.length, true);
    hiddenView.setUint32(hiddenEnd + 16, hiddenDirectory + archive.length, true);
    hiddenView.setUint16(hiddenEnd + 20, 1, true);
    const forged = new Uint8Array(archive.length + hidden.length);
    forged.set(archive); forged.set(hidden, archive.length);
    new DataView(forged.buffer).setUint16(archive.length - 2, hidden.length, true);
    expect(hidden.length).toBeLessThan(65536);
    await expect(importAvatarPackage(forged)).rejects.toThrow(/ZIP comments/);
  });

  it('rejects malformed containers, remote resources and invalid GLB lengths', async () => {
    await expect(importAvatarPackage(encoder.encode('not a ZIP'))).rejects.toThrow(/incomplete/);
    await expect(importAvatarPackage(new Uint8Array(30))).rejects.toThrow(/directory/);
    expect(() => validatePackageGlb(glb({ images: [{ uri: 'https://attacker.example/image.png' }] }))).toThrow(/external resources/);
    expect(() => validatePackageGlb(glb({ buffers: [{ uri: '../../private.bin' }] }))).toThrow(/external resources/);
    const truncated = glb().slice(0, -1);
    expect(() => validatePackageGlb(truncated)).toThrow(/complete glTF/);
    const invalid = glb(); new DataView(invalid.buffer).setUint32(12, 99999999, true);
    expect(() => validatePackageGlb(invalid)).toThrow(/chunk length/);
    expect(() => validatePackageGlb(glb({ images: { uri: 'data:image/png;base64,AA==' } }))).toThrow(/must be an array/);
    expect(() => validatePackageGlb(glb({ images: [null] }))).toThrow(/must be an object/);
  });

  it('enforces document and licence entry budgets', async () => {
    const input = await fixture();
    await expect(exportAvatarPackage({ ...input, licenseFiles: { 'large.txt': 'x'.repeat(65537) } })).rejects.toThrow(/size limit/);
    await expect(exportAvatarPackage({ ...input, basis: undefined })).rejects.toThrow(/basis.glb/);
    await expect(exportAvatarPackage({ ...input, licenseReferences: [{ label: 'x', url: 'javascript:alert(1)', license: 'CC0' }] })).rejects.toThrow(/HTTPS/);
    expect(() => validatePackageGlb(glb({ extras: { padding: 'x'.repeat(4 * 1024 * 1024) } }))).toThrow(/JSON exceeds/);
  });
});
