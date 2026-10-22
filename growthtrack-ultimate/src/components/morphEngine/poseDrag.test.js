// @vitest-environment node
import {expect,it} from 'vitest';
import {PerspectiveCamera,Ray,Vector3} from 'three';
import {glbMeshFixture} from '../../tests/helpers/glbMeshFixture';
import {glbSkeletonFixture} from '../../tests/helpers/glbSkeletonFixture';
import {resolveRigBones} from './boneMap';
import {applyJointPose} from './poseRuntime';
import {createPoseDrag,dragTarget,createJointDrag,dragJointAngles} from './poseDrag';
import {POSE_STUDIO} from '../../lib/poseStudio';

it('projects a real pointer ray into the rig frame under external rotation and nonuniform height scaling',()=>{
  const {root,skeleton}=glbSkeletonFixture('humanoid-preview-75-lite.glb'),body=glbMeshFixture('humanoid-preview-75-lite.glb').body;root.add(body);body.bind(skeleton);
  root.position.set(2,1,-1);root.rotation.y=.6;root.scale.set(.9,1.3,1.1);
  const bones=Object.fromEntries(Object.entries(resolveRigBones(skeleton)).map(([key,bone])=>[key,bone?{bone,rest:bone.quaternion.clone(),restScale:bone.scale.clone()}:null]));
  body.userData.poseEvidence={limbs:applyJointPose(bones,null)};
  const camera=new PerspectiveCamera();camera.position.set(2,2,4);camera.lookAt(new Vector3(...body.userData.poseEvidence.limbs.leftWrist.world));
  const session=createPoseDrag(body,'leftWrist',camera),normal=session.plane.normal;
  const endpoint=new Vector3(...body.userData.poseEvidence.limbs.leftWrist.world),desired=endpoint.clone().add(new Vector3(.1,.2,0));session.plane.projectPoint(desired,desired);
  const ray=new Ray(desired.clone().addScaledVector(normal,-3),normal.clone());
  const expected=session.frame.worldToLocal(desired.clone()).sub(session.origin).divideScalar(session.reach).toArray().map(v=>Math.round(v/.02)*.02);
  expect(dragTarget(session,ray)).toEqual(expected.map(v=>Number(v.toFixed(8))));
  const parallel=normal.clone().cross(new Vector3(0,1,0)).normalize();
  expect(dragTarget(session,new Ray(endpoint.clone().add(normal),parallel))).toBeNull();
  expect(createPoseDrag(null,'leftWrist',camera)).toBeNull();
});

it('rotates the selected joint with bounded angles and retains its third axis',()=>{
  for(const joint of POSE_STUDIO.joints){
    const session=createJointDrag(joint.id,[0,0,5],100,100);
    expect(dragJointAngles(session,140,120)).toEqual([5,10,5]);
    expect(dragJointAngles(session,1e5,-1e5)).toEqual([joint.limits[0][0],joint.limits[1][1],5]);
    expect(session.angles).toEqual([0,0,5]);
  }
  expect(createJointDrag('invalid',[],0,0)).toBeNull();
  expect(createJointDrag('head',[],NaN,0)).toBeNull();
});
