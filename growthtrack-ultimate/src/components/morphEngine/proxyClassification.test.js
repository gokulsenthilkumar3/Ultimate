// @vitest-environment node
import { BoxGeometry, BufferGeometry, Float32BufferAttribute, InterleavedBuffer, InterleavedBufferAttribute, Uint16BufferAttribute, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { createBodyCollisionProxies } from './garmentProxyFit.js';
import { triangleIntersectsConvex, classifyGarmentOutsideProxies, garmentAcceptance } from './proxyClassification.js';
const planes = [0, 1, 2].flatMap(axis => [-1, 1].map(sign => ({ normal: new Vector3().setComponent(axis, sign), constant: 1 })));

it('detects a triangle spanning a solid even when every vertex is outside', () => {
  expect(triangleIntersectsConvex([new Vector3(-3, 0, 0), new Vector3(3, 0, 0), new Vector3(0, 3, 0)], planes)).toBe(true);
  expect(triangleIntersectsConvex([new Vector3(0, 0, 0), new Vector3(0.1, 0, 0), new Vector3(0, 0.1, 0)], planes)).toBe(true);
  expect(triangleIntersectsConvex([new Vector3(-3, 0, 2), new Vector3(3, 0, 2), new Vector3(0, 3, 2)], planes)).toBe(false);
});

it('requires complete body enclosure and rejects an expanded or open classifier', () => {
  const body = new BoxGeometry(2, 2, 2), count = body.attributes.position.count;
  body.setAttribute('skinIndex', new Uint16BufferAttribute(new Uint16Array(count * 4), 4));
  body.setAttribute('skinWeight', new Float32BufferAttribute(Array.from({ length: count * 4 }, (_, i) => i % 4 === 0 ? 1 : 0), 4));
  const proxies = createBodyCollisionProxies({ geometry: body, skeleton: { bones: [{ name: 'Hips' }] } }, body, 0);
  const garment = new BufferGeometry(); garment.setAttribute('position', new Float32BufferAttribute([-3, 0, 2, 3, 0, 2, 0, 3, 2], 3)); garment.setIndex([0, 1, 2]);
  expect(classifyGarmentOutsideProxies(body, garment, proxies).outsideProxy).toBe(true);
  expect(classifyGarmentOutsideProxies(body, garment, [{ ...proxies[0], sourceFaces: [] }]).outsideProxy).toBe(false);
  expect(() => classifyGarmentOutsideProxies(body, garment, [{ ...proxies[0], watertight: false }])).toThrow(/closed/);
  expect(() => classifyGarmentOutsideProxies(body, garment, [{ ...proxies[0], clearance: 0.003 }])).toThrow(/unexpanded/);
  body.dispose(); garment.dispose();
});

it('resolves only signed disagreement, never actual crossings or insufficient clearance', () => {
  const contact = { intersectionPairs: 0, minimumTriangleGapMm: 3, minimumRequiredGapMm: 2, penetratingInteriorSamples: 5, penetratingOpeningBoundarySamples: 0 };
  const certificate = { outsideProxy: true, enclosedSource: true };
  expect(garmentAcceptance(contact).pass).toBe(false);
  expect(garmentAcceptance(contact, certificate)).toMatchObject({ pass: true, signedDiagnosticDisagreement: true });
  expect(garmentAcceptance({ ...contact, intersectionPairs: 1 }, certificate).pass).toBe(false);
  expect(garmentAcceptance({ ...contact, minimumTriangleGapMm: 1.9 }, certificate).pass).toBe(false);
  expect(garmentAcceptance(contact, { outsideProxy: true, enclosedSource: false }).pass).toBe(false);
  expect(garmentAcceptance({ ...contact, minimumTriangleGapMm: NaN }, certificate).pass).toBe(false);
  expect(garmentAcceptance({ ...contact, minimumRequiredGapMm: 0 }, certificate).pass).toBe(false);
});

it('checks interleaved XYZ, actual source-face coverage and bounded halfspaces before certifying an exterior', () => {
  const body = new BoxGeometry(2, 2, 2), garment = new BufferGeometry();
  // A non-position channel may be NaN; it is not part of the surface.
  const positions = new InterleavedBuffer(new Float32Array([-3, 0, 2, NaN, 3, 0, 2, NaN, 0, 3, 2, NaN]), 4);
  garment.setAttribute('position', new InterleavedBufferAttribute(positions, 3, 0)); garment.setIndex([0, 1, 2]);
  const proxy = { watertight: true, clearance: 0, region: 'box', planes, sourceFaces: Array.from({ length: 12 }, (_, face) => face) };
  try {
    expect(classifyGarmentOutsideProxies(body, garment, [proxy]).outsideProxy).toBe(true);
    expect(() => classifyGarmentOutsideProxies(body, garment, [{ ...proxy, sourceFaces: [...proxy.sourceFaces.slice(1), 12] }])).toThrow(/source triangle/);
    // Five planes can enclose all source corners and still leave an open exit.
    expect(() => classifyGarmentOutsideProxies(body, garment, [{ ...proxy, planes: planes.slice(1) }])).toThrow(/bounded closed/);
    expect(() => classifyGarmentOutsideProxies(body, garment, [{ ...proxy, planes: planes.map(plane => ({ ...plane, constant: NaN })) }])).toThrow(/plane/);
    garment.attributes.position.setX(0, NaN);
    expect(() => classifyGarmentOutsideProxies(body, garment, [proxy])).toThrow(/finite/);
    garment.attributes.position.setX(0, -3); garment.setIndex([0, 1, 3]);
    expect(() => classifyGarmentOutsideProxies(body, garment, [proxy])).toThrow(/triangle index/);
  } finally { body.dispose(); garment.dispose(); }
});
