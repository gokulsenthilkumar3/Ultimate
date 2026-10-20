import { describe, it, expect } from 'vitest';
import { Bone, BufferAttribute, BufferGeometry, Group, Mesh, Skeleton, SkinnedMesh } from 'three';
import { createRegionFrameSampler } from './regionFrames';
import { fitRegionFrame } from './cameraFraming';
import { BODY_PART_MAP } from './bodyRegions';

function fixture() {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array([1,2,0, 2,3,0, -1,1,0, -2,2,0]),3));
  geometry.setAttribute('skinIndex', new BufferAttribute(new Uint16Array([0,1,2,3, 0,1,2,3, 1,0,2,3, 1,0,2,3]),4));
  // No individual influence reaches 0.5. Dominance still identifies the region.
  geometry.setAttribute('skinWeight', new BufferAttribute(new Float32Array(Array(4).fill([.4,.3,.2,.1]).flat()),4));
  const bones = ['LeftHand','RightHand','Hips','Head'].map(name => { const bone = new Bone(); bone.name=name; return bone; });
  const body = new SkinnedMesh(geometry); bones.forEach(bone => body.add(bone)); body.bind(new Skeleton(bones));
  const root = new Group(); root.add(body); root.position.set(10,3,0); root.scale.y=2; root.updateMatrixWorld(true);
  return { root, body, bones };
}
describe('evaluated body-region focus bounds', () => {
  it('keeps subject sides distinct and removes clone translation while retaining height scale', () => {
    const {root,body}=fixture();
    const sample=createRegionFrameSampler(body);
    const frames=sample(false,root);
    [1.5,5,0].forEach((value,index) => expect(frames.leftHand.center[index]).toBeCloseTo(value,5));
    [-1.5,3,0].forEach((value,index) => expect(frames.rightHand.center[index]).toBeCloseTo(value,5));
    [1,2,0].forEach((value,index) => expect(frames.leftHand.size[index]).toBeCloseTo(value,5));
  });
  it('remeasures posed skin and excludes private geometry until explicitly included', () => {
    const {root,body,bones}=fixture();
    const anatomy=new Mesh(body.geometry.clone()); root.add(anatomy); root.updateMatrixWorld(true);
    const sample=createRegionFrameSampler(body,anatomy);
    expect(sample(false,root).anatomy).toBeUndefined();
    const initial=sample(false,root).leftHand.center[0];
    bones[0].position.x=1; root.updateMatrixWorld(true);
    expect(sample(false,root).leftHand.center[0]).toBeCloseTo(initial+.4);
    expect(sample(true,root).anatomy.source).toBe('evaluated-surface');
  });
  it('uses evaluated centers and increases distance on narrow viewports', () => {
    const evaluated={center:[.7,.9,.2],size:[.4,.2,.1]};
    const landscape=fitRegionFrame({region:BODY_PART_MAP.leftHand,evaluated,width:900,height:600});
    const portrait=fitRegionFrame({region:BODY_PART_MAP.leftHand,evaluated,width:320,height:600});
    expect(portrait.center).toEqual(evaluated.center);
    expect(portrait.distance).toBeGreaterThan(landscape.distance);
  });
});
