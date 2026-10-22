// @vitest-environment node
import { describe,expect,it } from 'vitest';
import { Box3, Quaternion, SkinnedMesh, Vector3 } from 'three';
import { glbSkeletonFixture } from '../../tests/helpers/glbSkeletonFixture';
import { glbMeshFixture } from '../../tests/helpers/glbMeshFixture';
import { resolveRigBones } from './boneMap';
import { applyJointPose, applyReachTargets, freezeJointPose, solveTwoBone } from './poseRuntime';
import { POSE_STUDIO, emptyPose, poseIsActive } from '../../lib/poseStudio';
import { createSkinnedBoundsUpdater } from './skinnedBounds';

const assets=['humanoid-base.glb','humanoid-base-lite.glb','humanoid-adult-v2.glb','humanoid-adult-v2-lite.glb'];
const controller=skeleton=>Object.fromEntries(Object.entries(resolveRigBones(skeleton)).map(([key,bone])=>[key,bone?{bone,rest:bone.quaternion.clone(),restScale:bone.scale.clone()}:null]));
const distance=(a,b)=>new Vector3(...a).distanceTo(new Vector3(...b));

describe.each(assets)('%s authored rig posing',file=>{
  it('reaches all four endpoints without stretching bones, including scaled and rotated viewers',()=>{
    for(const scale of [1,.8,1.25]) {
      const {root,skeleton}=glbSkeletonFixture(file);root.scale.set(1,scale,1);root.rotation.y=.4;
      const bones=controller(skeleton),before=applyReachTargets(bones),targets={};
      for(const limb of POSE_STUDIO.limbs)targets[limb.id]=[limb.id.startsWith('left')?.2:-.2,-.55,.3];
      const after=applyJointPose(bones,{...emptyPose(),enabled:true,targets});
      for(const limb of POSE_STUDIO.limbs) {
        expect(after[limb.id].reached).toBe(true);
        expect(after[limb.id].error).toBeLessThan(1e-7);
        expect(distance(after[limb.id].normalized,targets[limb.id])).toBeLessThan(1e-7);
        expect(after[limb.id].reach).toBeCloseTo(before[limb.id].reach,10);
      }
    }
  });
  it('clamps unreachable endpoints and resets every bone to rest when the pose is cleared',()=>{
    const {skeleton}=glbSkeletonFixture(file),bones=controller(skeleton);
    expect(bones.spine1.bone.name).toBe('Spine1');
    const result=applyJointPose(bones,{enabled:true,joints:{head:[20,30,0]},targets:{leftWrist:[1.2,1.2,1.2],rightAnkle:[0,0,0]}});
    expect(result.leftWrist.reached).toBe(false);expect(result.leftWrist.error).toBeGreaterThan(0);
    expect(result.rightAnkle.reached).toBe(false);
    expect(new Vector3(...result.leftWrist.normalized).length()).toBeLessThanOrEqual(1);
    applyJointPose(bones,emptyPose());
    for(const item of Object.values(bones).filter(Boolean))expect(item.bone.quaternion.angleTo(item.rest)).toBeLessThan(1e-7);
  });
  it('settles static captures synchronously and restores the live joint transforms',()=>{
    const {skeleton}=glbSkeletonFixture(file),bones=controller(skeleton);
    bones.head.bone.quaternion.setFromAxisAngle(new Vector3(0,1,0),.1);
    const before=bones.head.bone.quaternion.clone();
    const restore=freezeJointPose(bones,{enabled:true,joints:{head:[0,30,0]},targets:{}},{});
    expect(bones.head.bone.quaternion.angleTo(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.PI/6))).toBeLessThan(1e-7);
    restore();expect(bones.head.bone.quaternion.angleTo(before)).toBeLessThan(1e-7);
  });
  it('retains finite full-body skin bounds after wrist posing',()=>{
    const {root,skeleton}=glbSkeletonFixture(file),body=new SkinnedMesh(glbMeshFixture(file).body.geometry);
    root.add(body);body.bind(skeleton);const bones=controller(skeleton);
    applyJointPose(bones,{enabled:true,joints:{},targets:{leftWrist:[.2,-.6,.3]}});
    root.updateMatrixWorld(true);skeleton.update();const box=new Box3(),point=new Vector3();
    for(let i=0;i<body.geometry.attributes.position.count;i++){
      body.getVertexPosition(i,point);expect(point.toArray().every(Number.isFinite)).toBe(true);box.expandByPoint(point);
    }
    expect(box.getSize(new Vector3()).y).toBeGreaterThan(1.6);
    expect(box.getSize(new Vector3()).y).toBeLessThan(2);
  });
  it('keeps the picking bounds valid after an arm is raised above its rest envelope',()=>{
    const {root,skeleton}=glbSkeletonFixture(file),body=new SkinnedMesh(glbMeshFixture(file).body.geometry);
    root.add(body);body.bind(skeleton);const bones=controller(skeleton);
    body.computeBoundingBox();body.computeBoundingSphere();
    applyJointPose(bones,{enabled:true,joints:{leftUpperArm:[0,0,100]},targets:{}});
    root.updateMatrixWorld(true);skeleton.update();
    createSkinnedBoundsUpdater(body)();
    const point=new Vector3();let outside=0;
    for(let i=0;i<body.geometry.attributes.position.count;i++) {
      body.getVertexPosition(i,point);if(body.boundingSphere.distanceToPoint(point)>1e-6)outside++;
    }
    expect(outside).toBe(0);
  });
});
it('keeps a valid elbow when target and pole are on any principal axis',()=>{
  for(const target of [[0,0,1],[0,1,0],[1,0,0],[0,0,0]]) {
    const result=solveTwoBone({root:[0,0,0],l1:.7,l2:.6,target,pole:target});
    expect(distance([0,0,0],result.mid)).toBeCloseTo(.7,10);
    expect(distance(result.mid,result.end)).toBeCloseTo(.6,10);
    expect(result.mid.every(Number.isFinite)).toBe(true);
  }
});
it('activates presentation poses only in an ordinary solo preview',()=>{
  const base={pose:{enabled:true},viewMode:'SOLO',measurementView:false,renderMode:'normal'};
  expect(poseIsActive(base)).toBe(true);
  for(const patch of [{viewMode:'DUAL'},{viewMode:'TIMELINE'},{measurementView:true},{renderMode:'ghost'},{overridden:true},{pose:emptyPose()}])
    expect(poseIsActive({...base,...patch})).toBe(false);
});
