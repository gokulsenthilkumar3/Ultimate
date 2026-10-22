// @vitest-environment node
import { expect,it } from 'vitest';
import { Matrix4, SkinnedMesh, Vector3 } from 'three';
import { glbSkeletonFixture } from '../../tests/helpers/glbSkeletonFixture';
import { glbMeshFixture } from '../../tests/helpers/glbMeshFixture';
import { resolveRigBones } from './boneMap';
import { applyJointPose } from './poseRuntime';
import { prepareBodyPoseBinding } from './bodyPoseBinding';
import { prepareHeadPoseBinding } from './headPoseBinding';

it.each(['humanoid-base.glb','humanoid-base-lite.glb','humanoid-adult-v2.glb','humanoid-adult-v2-lite.glb'])('localizes arm deformation without changing rest shape, morphs or shared buffers in %s',file=>{
  const {root,skeleton}=glbSkeletonFixture(file),source=glbMeshFixture(file).body;
  const body=new SkinnedMesh(source.geometry.clone());root.add(body);body.bind(skeleton);
  const bones=Object.fromEntries(Object.entries(resolveRigBones(skeleton)).map(([key,bone])=>[key,bone?{bone,rest:bone.quaternion.clone(),restScale:bone.scale.clone()}:null]));
  const originalJoints=body.geometry.attributes.skinIndex,originalWeights=body.geometry.attributes.skinWeight;
  const position=body.geometry.attributes.position,morphs=body.geometry.morphAttributes.position.slice(),point=new Vector3();
  const wrist=bones.leftHand.bone.getWorldPosition(new Vector3()),forearm=bones.leftForeArm.bone.getWorldPosition(new Vector3());
  // The palm/fingers distal to the wrist should follow the arm rigidly when
  // only its upper joint rotates. Unrelated torso/leg influences bent them.
  const direction=wrist.clone().sub(forearm).normalize(),hand=[];
  const shoulder=bones.leftUpperArm.bone.getWorldPosition(new Vector3()),waist=bones.spine1.bone.getWorldPosition(new Vector3()),torso=[];
  for(let i=0;i<position.count;i++) {
    point.fromBufferAttribute(position,i);
    if(point.clone().sub(wrist).dot(direction)>wrist.distanceTo(forearm)*.1 && point.distanceTo(wrist)<wrist.distanceTo(forearm)*.65)hand.push(i);
    if(Math.abs(point.x)<Math.abs(shoulder.x)*.7 && point.y>waist.y && point.y<(waist.y+shoulder.y)/2)torso.push(i);
  }
  expect(hand.length).toBeGreaterThan(50);
  expect(torso.length).toBeGreaterThan(50);
  const torsoMotion=()=>Math.max(...torso.map(i=>body.getVertexPosition(i,new Vector3()).distanceTo(new Vector3().fromBufferAttribute(position,i))));
  const raised={enabled:true,joints:{leftUpperArm:[0,0,100]},targets:{}};
  const handError=()=>{
    root.updateMatrixWorld(true);skeleton.update();
    const index=skeleton.bones.indexOf(bones.leftHand.bone),matrix=new Matrix4().multiplyMatrices(bones.leftHand.bone.matrixWorld,skeleton.boneInverses[index]);
    return Math.max(...hand.map(i=>body.getVertexPosition(i,new Vector3()).distanceTo(new Vector3().fromBufferAttribute(position,i).applyMatrix4(matrix))));
  };
  applyJointPose(bones,raised);const before=handError(),torsoBefore=torsoMotion();applyJointPose(bones,null);root.updateMatrixWorld(true);
  const report=prepareBodyPoseBinding(body);prepareHeadPoseBinding(body);
  expect(report.corrected).toBeGreaterThan(1000);
  expect(body.geometry.attributes.skinWeight).not.toBe(originalWeights);
  expect(source.geometry.attributes.skinWeight.array).toEqual(originalWeights.array);
  expect(body.geometry.attributes.position).toBe(position);
  expect(body.geometry.morphAttributes.position).toEqual(morphs);
  for(let i=0;i<position.count;i++) {
    expect(body.getVertexPosition(i,point).distanceTo(new Vector3().fromBufferAttribute(position,i))).toBeLessThan(1e-6);
    const weights=body.geometry.attributes.skinWeight;
    expect([0,1,2,3].reduce((sum,k)=>sum+weights.getComponent(i,k),0)).toBeCloseTo(1,6);
  }
  applyJointPose(bones,raised);const after=handError();
  expect(after).toBeLessThan(before*.1);
  expect(after).toBeLessThan(.002);
  expect(torsoMotion()).toBeLessThan(torsoBefore*.2);
  expect(torsoMotion()).toBeLessThan(.01);
  // No mutation of either source attribute's contents.
  expect(source.geometry.attributes.skinIndex.array).toEqual(originalJoints.array);
});

it('leaves an unsupported custom rig untouched',()=>{
  const {root,skeleton}=glbSkeletonFixture('humanoid-base-lite.glb'),source=glbMeshFixture().body;
  const body=new SkinnedMesh(source.geometry);root.add(body);body.bind(skeleton);
  skeleton.bones[0].name='Custom root';const original=body.geometry.attributes.skinWeight;
  expect(prepareBodyPoseBinding(body)).toBeNull();expect(body.geometry.attributes.skinWeight).toBe(original);
});
