import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ANATOMY_INPUT_RANGES, ANATOMY_REFERENCE, CALIBRATION_REFERENCE_HEIGHT_CM, PLACEHOLDER_GEOMETRY, anatomyMorphWeights, displayLimits, resolveAnatomyCm, typicalRange } from './anatomyCalibration';
import { REFERENCE_HEIGHT_CM } from './metricsToBlendshapes';
import { BODY_METRIC_RANGES } from '../../lib/bodyMetricContract';

// Minimal glTF reader: dense data, sparse overrides, zero-filled when absent.
function loadGlb(file) {
  const buffer = readFileSync(file);
  const jsonLength = buffer.readUInt32LE(12);
  const gltf = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8'));
  const bin = buffer.subarray(20 + jsonLength + 8);
  const slice = (view, offset, bytes) => {
    const start = (gltf.bufferViews[view].byteOffset || 0) + (offset || 0);
    return new Uint8Array(bin.subarray(start, start + bytes)).buffer;
  };
  const read = index => {
    const accessor = gltf.accessors[index];
    const out = new Float32Array(accessor.count * 3);
    if (accessor.bufferView != null) out.set(new Float32Array(slice(accessor.bufferView, accessor.byteOffset, accessor.count * 12)));
    if (accessor.sparse) {
      const { indices, values, count } = accessor.sparse;
      const Index = indices.componentType === 5125 ? Uint32Array : indices.componentType === 5123 ? Uint16Array : Uint8Array;
      const ids = new Index(slice(indices.bufferView, indices.byteOffset, count * Index.BYTES_PER_ELEMENT));
      const deltas = new Float32Array(slice(values.bufferView, values.byteOffset, count * 12));
      ids.forEach((vertex, k) => out.set(deltas.subarray(k * 3, k * 3 + 3), vertex * 3));
    }
    return out;
  };
  return { gltf, read };
}

// Length: polyline through shaft ring centres from the skin-junction ring to
// the tip vertex. Circumference: perimeter of the mid-shaft ring. The ring
// layout is declared by the converter in the anatomy mesh extras.
function measure(file) {
  const { gltf, read } = loadGlb(file);
  const body = gltf.accessors[gltf.meshes.find(mesh => mesh.name === 'GrowthTrackBody').primitives[0].attributes.POSITION];
  const anatomy = gltf.meshes.find(mesh => mesh.name === 'GrowthTrackPrivateAnatomy');
  const { segments, shaftRings, baseRing, midRing, tipVertex } = anatomy.extras.layout;
  const primitive = anatomy.primitives[0];
  const names = anatomy.extras.targetNames;
  const positions = read(primitive.attributes.POSITION);
  const lengthDelta = read(primitive.targets[names.indexOf('d_length')].POSITION);
  const girthDelta = read(primitive.targets[names.indexOf('d_girth')].POSITION);
  const at = (delta, weight) => vertex => [0, 1, 2].map(axis => positions[vertex * 3 + axis] + weight * delta[vertex * 3 + axis]);
  const ringCentre = (point, ring) => {
    const sum = [0, 0, 0];
    for (let k = 0; k < segments; k += 1) point(ring * segments + k).forEach((value, axis) => { sum[axis] += value / segments; });
    return sum;
  };
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const length = weight => {
    const point = at(lengthDelta, weight);
    const centres = Array.from({ length: shaftRings - baseRing }, (_, i) => ringCentre(point, baseRing + i)).concat([point(tipVertex)]);
    return centres.slice(1).reduce((sum, centre, i) => sum + distance(centres[i], centre), 0);
  };
  const perimeter = weight => {
    const point = at(girthDelta, weight);
    return Array.from({ length: segments }, (_, k) => distance(point(midRing * segments + k), point(midRing * segments + (k + 1) % segments)))
      .reduce((sum, value) => sum + value, 0);
  };
  return {
    bodyHeightUnits: body.max[1] - body.min[1],
    lengthRestUnits: length(0), lengthDeltaUnits: length(1) - length(0),
    circumferenceRestUnits: perimeter(0), circumferenceDeltaUnits: perimeter(1) - perimeter(0),
  };
}

describe('anatomy calibration', () => {
  it.each(['humanoid-base.glb', 'humanoid-base-lite.glb'])('matches the geometry measured from %s', file => {
    const measured = measure(path.resolve('public/assets/models', file));
    for (const [key, value] of Object.entries(PLACEHOLDER_GEOMETRY)) expect(measured[key], key).toBeCloseTo(value, 4);
  });

  it('uses the viewer reference height and the shared contract ranges', () => {
    expect(CALIBRATION_REFERENCE_HEIGHT_CM).toBe(REFERENCE_HEIGHT_CM);
    for (const key of ['anatomyLengthCm', 'anatomyGirthCm']) {
      expect(BODY_METRIC_RANGES[key]).toMatchObject({ ...ANATOMY_INPUT_RANGES[key], unit: 'cm' });
    }
  });

  it('reports the published typical band and draws the whole accepted input range', () => {
    expect(ANATOMY_REFERENCE.citation).toMatch(/Veale.*2015/);
    expect(typicalRange('anatomyLengthCm')).toEqual({ min: 6, max: 12.3 });
    expect(typicalRange('anatomyGirthCm')).toEqual({ min: 7.5, max: 11.1 });
    expect(displayLimits(1)).toEqual({
      anatomyLengthCm: { min: ANATOMY_INPUT_RANGES.anatomyLengthCm.min, max: ANATOMY_INPUT_RANGES.anatomyLengthCm.max },
      anatomyGirthCm: { min: ANATOMY_INPUT_RANGES.anatomyGirthCm.min, max: ANATOMY_INPUT_RANGES.anatomyGirthCm.max },
    });
    // Taller owners stretch vertically: length limits scale, circumference does not.
    expect(displayLimits(1.1).anatomyLengthCm.min).toBeCloseTo(3.3, 1);
    expect(displayLimits(1.1).anatomyGirthCm).toEqual(displayLimits(1).anatomyGirthCm);
  });

  it('draws typical values as entered and unset values at the published mean', () => {
    const typical = anatomyMorphWeights({ anatomyLengthCm: 9.2, anatomyGirthCm: 9.3 });
    expect(typical.d_length).toBeCloseTo((9.2 - 3) / 13, 3);
    expect(typical.d_girth).toBeCloseTo((9.3 - 5) / 9, 3);
    expect(typical.clamped).toEqual({ anatomyLengthCm: null, anatomyGirthCm: null });
    const unset = anatomyMorphWeights({});
    expect(unset.d_length).toBeCloseTo((ANATOMY_REFERENCE.anatomyLengthCm.meanCm - 3) / 13, 3);
    expect(unset.d_girth).toBeCloseTo((ANATOMY_REFERENCE.anatomyGirthCm.meanCm - 5) / 9, 3);
    expect(unset.clamped).toEqual({ anatomyLengthCm: null, anatomyGirthCm: null });
  });

  it('flags values the asset cannot draw instead of hiding the difference', () => {
    // A converted legacy inch value can fall outside the accepted cm range.
    const result = anatomyMorphWeights({ d_length: 1, d_girth: 7 });
    expect(result).toMatchObject({ d_length: 0, d_girth: 1, clamped: { anatomyLengthCm: 'below', anatomyGirthCm: 'above' } });
  });

  it('converts retired inch fields and prefers centimetre values', () => {
    expect(resolveAnatomyCm({ d_size: 4, d_girth: 4 })).toEqual({ lengthCm: 10.2, girthCm: 10.2, convertedFromInches: true });
    expect(resolveAnatomyCm({ d_length: 4, d_size: 9 }).lengthCm).toBe(10.2);
    expect(resolveAnatomyCm({ anatomyLengthCm: 9, d_size: 9 })).toEqual({ lengthCm: 9, girthCm: null, convertedFromInches: false });
    expect(resolveAnatomyCm({ anatomyLengthCm: '', d_size: '' })).toEqual({ lengthCm: null, girthCm: null, convertedFromInches: false });
  });
});
