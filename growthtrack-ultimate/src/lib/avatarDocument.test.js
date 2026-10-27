import { describe, expect, it } from 'vitest';
import { createAvatarDocument, parseAvatarDocument, serializeAvatarDocument, validateAvatarDocument, updateAvatarDocumentContext, assertAvatarAssetCompatible, MAX_AVATAR_DOCUMENT_BYTES } from './avatarDocument.js';

const asset = { family: 'canonical-test', sourceRevision: 'abc123', topologyHash: 'ordered-indices-v1', lod: 'editor', rigVersion: 'mixamo-52-v1', materialVersion: 'pbr-v1', parameterVersion: 'semantic-v1' };
const makeDocument = (overrides = {}) => createAvatarDocument({ asset, id: 'avatar-test', createdAt: '2026-10-26T10:00:00.000Z', current: { parameters: { noseWidth: 0.2 }, appearance: { skinColor: '#bb8877' } }, goal: { parameters: { noseWidth: 0.7 } }, ...overrides });

describe('versioned semantic avatar document', () => {
  it('round-trips both contexts and complete source identity without sharing references', () => {
    const shared = { parameters: { noseWidth: 0.2 }, equipment: { hair: { id: 'short' } } };
    const document = makeDocument({ current: shared, goal: shared });
    shared.parameters.noseWidth = 1;
    shared.equipment.hair.id = 'other';
    document.contexts.current.parameters.noseWidth = 0.8;
    document.contexts.current.equipment.hair.id = 'new';
    expect(document.contexts.goal.parameters.noseWidth).toBe(0.2);
    expect(document.contexts.goal.equipment.hair.id).toBe('short');
    const restored = parseAvatarDocument(serializeAvatarDocument(document), { expectedAsset: asset });
    expect(restored).toEqual(document);
    restored.contexts.current.parameters.noseWidth = 0.3;
    expect(document.contexts.current.parameters.noseWidth).toBe(0.8);
  });

  it('does not silently drop unknown future schema or unsupported fields', () => {
    expect(() => validateAvatarDocument({ ...makeDocument(), schemaVersion: 2 })).toThrow(/migration/);
    expect(() => validateAvatarDocument({ ...makeDocument(), profile: { height: 175 } })).toThrow(/unsupported root/);
    expect(() => makeDocument({ current: { parameters: {}, metrics: { weight: 80 } } })).toThrow(/unsupported current/);
    expect(() => validateAvatarDocument({ ...makeDocument(), activeContext: 'self' })).toThrow(/activeContext/);
    expect(() => validateAvatarDocument({ ...makeDocument(), units: 'cm' })).toThrow(/metres/);
  });

  it('applies partial edits to only the requested context while preserving a saved document', () => {
    const saved = makeDocument();
    const next = updateAvatarDocumentContext(saved, 'goal', { parameters: { eyeSize: 0.4 }, appearance: { eyeColor: '#6b3b20' } }, { updatedAt: '2026-10-26T12:00:00.000Z' });
    expect(next.contexts.goal.parameters).toEqual({ noseWidth: 0.7, eyeSize: 0.4 });
    expect(next.contexts.current.parameters).toEqual({ noseWidth: 0.2 });
    expect(saved.contexts.goal.parameters).toEqual({ noseWidth: 0.7 });
    expect(next.updatedAt).toBe('2026-10-26T12:00:00.000Z');
    expect(() => updateAvatarDocumentContext(saved, 'timeline', {})).toThrow(/edit context/);
  });

  it('requires explicit family, revision, topology, LOD and rig identity', () => {
    for (const key of ['family', 'sourceRevision', 'topologyHash', 'lod', 'rigVersion']) {
      const incomplete = { ...asset }; delete incomplete[key];
      expect(() => makeDocument({ asset: incomplete })).toThrow(new RegExp(key));
    }
    expect(() => assertAvatarAssetCompatible(asset, { ...asset, topologyHash: 'different-same-count' })).toThrow(/topologyHash/);
    expect(() => parseAvatarDocument(serializeAvatarDocument(makeDocument()), { expectedAsset: { ...asset, rigVersion: 'other' } })).toThrow(/rigVersion/);
  });

  it('rejects nonfinite, non-JSON, dangerous and overly complex parameter state', () => {
    expect(() => makeDocument({ current: { parameters: { noseWidth: Infinity } } })).toThrow(/finite/);
    expect(() => makeDocument({ current: { parameters: { noseWidth: '0.2' } } })).toThrow(/numbers/);
    expect(() => makeDocument({ current: { appearance: { callback: () => {} } } })).toThrow(/object/);
    const prototypeInput = JSON.parse('{"__proto__":{"polluted":true}}');
    expect(() => makeDocument({ current: { appearance: prototypeInput } })).toThrow(/invalid key/);
    let nested = { value: 1 };
    for (let index = 0; index < 15; index++) nested = { nested };
    expect(() => makeDocument({ current: { appearance: nested } })).toThrow(/complex/);
    expect({}.polluted).toBeUndefined();
  });

  it('rejects malformed or oversized text before parsing and never mutates caller state', () => {
    expect(() => parseAvatarDocument('{')).toThrow(/invalid JSON/);
    expect(() => parseAvatarDocument(' '.repeat(MAX_AVATAR_DOCUMENT_BYTES + 1))).toThrow(/limit/);
    const document = makeDocument();
    const original = structuredClone(document);
    expect(() => validateAvatarDocument({ ...document, asset: { ...asset, lod: '' } })).toThrow(/lod/);
    expect(document).toEqual(original);
  });
});
