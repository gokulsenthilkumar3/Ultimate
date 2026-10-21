import { describe, expect, it } from 'vitest';
import { createAvatarSnapshot } from '../lib/avatarProfile';
import { metricLogsToSnapshots } from '../lib/physiqueProfile';
import { bakeAvatarSurface } from '../components/morphEngine/avatarExport';
import { BufferGeometry, Float32BufferAttribute, Mesh, MeshStandardMaterial, Group } from 'three';

describe('personal avatar snapshots and export', () => {
  it('requires real entered height and keeps a detached baseline', () => {
    expect(() => createAvatarSnapshot({ metrics: {} })).toThrow(/height/);
    const metrics = { height: 175, waist: 80, hairColor: '#123456' };
    const weights = { gut_volume: 0.2 };
    const snapshot = createAvatarSnapshot({ metrics, weights, id: 'baseline', kind: 'baseline' });
    metrics.waist = 90; weights.gut_volume = 0.8;
    expect(snapshot.metrics.waist).toBe(80);
    expect(snapshot.weights.gut_volume).toBe(0.2);
    expect(snapshot.metrics.hairColor).toBe('#123456');
  });
  it('keeps version metadata when reloading saved snapshots', () => {
    const snapshot = createAvatarSnapshot({ metrics: { height: 180 }, asset: { version: 'test' }, id: 's' });
    const [restored] = metricLogsToSnapshots([{ id: 's', metric: 'physique_snapshot', date: '2026-09-20', metrics: snapshot.metrics, avatarSnapshot: snapshot }]);
    expect(restored.asset.version).toBe('test');
    expect(restored.date).toBe(snapshot.date);
  });
  it('exports the evaluated morph and transform without mutating shared geometry', () => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
    geometry.morphTargetsRelative = true;
    geometry.morphAttributes.position = [new Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3)];
    const mesh = new Mesh(geometry, new MeshStandardMaterial());
    mesh.morphTargetInfluences[0] = 0.5; mesh.scale.setScalar(2);
    const root = new Group(); root.add(mesh); root.position.x = 4;
    const baked = bakeAvatarSurface(root).children[0];
    expect(baked.geometry.attributes.position.getZ(0)).toBeCloseTo(1);
    expect(baked.geometry.attributes.position.getX(1)).toBeCloseTo(2);
    expect(geometry.attributes.position.getZ(0)).toBe(0);
    expect(baked.geometry.morphAttributes).toEqual({});
  });
});
