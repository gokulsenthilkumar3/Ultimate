// @vitest-environment node
import { expect,it } from 'vitest';
import { DoubleSide, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { glbSkeletonFixture } from '../../tests/helpers/glbSkeletonFixture';
import { glbMeshFixture } from '../../tests/helpers/glbMeshFixture';
import { resolveRigBones } from './boneMap';
import { applyJointPose, freezeJointPose } from './poseRuntime';
import { createSkinnedBoundsUpdater } from './skinnedBounds';
import { prepareBodyPoseBinding } from './bodyPoseBinding';
import { prepareHeadPoseBinding } from './headPoseBinding';
import { createMorphRig } from './morphRig';

const bundledModels = [
  'humanoid-base.glb', 'humanoid-base-lite.glb',
  'humanoid-adult-v2.glb', 'humanoid-adult-v2-lite.glb',
  'humanoid-preview-75.glb', 'humanoid-preview-75-lite.glb',
];

function fixture(file='humanoid-base-lite.glb') {
  const {root,skeleton}=glbSkeletonFixture(file),source=glbMeshFixture(file).body;
  const body=source;body.material=new MeshBasicMaterial({side:DoubleSide});
  root.add(body);body.bind(skeleton);
  if(!body.userData.growthtrack?.bindingPrepared){prepareBodyPoseBinding(body);prepareHeadPoseBinding(body);}
  const bones=Object.fromEntries(Object.entries(resolveRigBones(skeleton)).map(([key,bone])=>[key,bone?{bone,rest:bone.quaternion.clone(),restScale:bone.scale.clone()}:null]));
  return {root,skeleton,body,bones,updateRig:createMorphRig(body),update:createSkinnedBoundsUpdater(body)};
}
function containsSkin(body) {
  const point=new Vector3();
  for(let i=0;i<body.geometry.attributes.position.count;i++) {
    body.getVertexPosition(i,point);
    if(!body.boundingBox.containsPoint(point) || body.boundingSphere.distanceToPoint(point)>1e-6)return false;
  }
  return true;
}
it.each(bundledModels)('bounds posed and combined-morph skin under external transforms in %s',file=>{
  const {root,body,bones,updateRig,update}=fixture(file);
  root.position.set(2,3,-1);root.rotation.set(.1,.5,-.2);root.scale.set(.9,1.3,1.1);
  for(const name of ['upper_arm_length','forearm_length','leg_length','shoulder_width','body_fat','muscle_mass']) {
    const index=body.morphTargetDictionary[name];if(index!=null)body.morphTargetInfluences[index]=.8;
  }
  updateRig();
  for(const joints of [{},{leftUpperArm:[0,0,100],rightUpperArm:[0,0,-100]},
    {head:[25,55,20],neck:[15,25,15]}, {leftThigh:[75,30,30],leftShin:[-100,0,0],leftFoot:[35,20,15]},
    {spine1:[25,20,15],spine2:[25,25,20]}]) {
    applyJointPose(bones,{enabled:true,joints,targets:{},digits:{leftHand:{shape:'fist',strength:1},leftFoot:{curl:.7}}});update();
    expect(containsSkin(body)).toBe(true);
    expect(body.userData.skinBounds.method).toBe('joint-morph-envelope');
  }
});
it.each(bundledModels)('keeps posed triangles pickable under external transforms after the rest bounds were cached in %s',file=>{
  const {root,body,bones,updateRig,update}=fixture(file);body.computeBoundingBox();body.computeBoundingSphere();
  const oldSphere=body.boundingSphere.clone();
  root.position.set(2,3,-1);root.rotation.set(.1,.5,-.2);root.scale.set(.9,1.3,1.1);
  for(const name of ['upper_arm_length','forearm_length','hand_length'])body.morphTargetInfluences[body.morphTargetDictionary[name]]=.6;
  updateRig();
  applyJointPose(bones,{enabled:true,joints:{leftUpperArm:[0,0,100]},targets:{}});update();
  const indices=body.geometry.index,a=new Vector3(),b=new Vector3(),c=new Vector3(),normal=new Vector3(),center=new Vector3();let triangle=-1;
  for(let i=0;i<indices.count;i+=3) {
    body.getVertexPosition(indices.getX(i),a);body.getVertexPosition(indices.getX(i+1),b);body.getVertexPosition(indices.getX(i+2),c);
    center.copy(a).add(b).add(c).multiplyScalar(1/3);
    if(oldSphere.distanceToPoint(center)>.03){
      a.applyMatrix4(body.matrixWorld);b.applyMatrix4(body.matrixWorld);c.applyMatrix4(body.matrixWorld);
      center.copy(a).add(b).add(c).multiplyScalar(1/3);
      normal.copy(b).sub(a).cross(c.clone().sub(a)).normalize();
      if(normal.lengthSq()>.5){triangle=i/3;break;}
    }
  }
  expect(triangle).toBeGreaterThanOrEqual(0);
  const ray=new Raycaster(center.clone().addScaledVector(normal,.005),normal.clone().negate(),0,.01);
  expect(ray.intersectObject(body,false).some(hit=>hit.faceIndex===triangle)).toBe(true);
});
it('rebuilds the envelope after clone geometry edits and falls back exactly for nonstandard morph ranges',()=>{
  const {body,update}=fixture();update();
  const position=body.geometry.attributes.position;position.setY(0,position.getY(0)+3);position.needsUpdate=true;update();
  expect(containsSkin(body)).toBe(true);
  for(const value of [-.4,1.6]) {
    body.morphTargetInfluences[0]=value;update();
    expect(body.userData.skinBounds.method).toBe('exact-posed-vertices');expect(containsSkin(body)).toBe(true);
  }
});
it('updates and restores bounds when a static capture settles a different pose without a render frame',()=>{
  const {body,bones,update}=fixture();update();
  const restore=freezeJointPose(bones,{enabled:true,joints:{leftUpperArm:[0,0,100]},targets:{}},{},update);
  expect(containsSkin(body)).toBe(true);restore();expect(containsSkin(body)).toBe(true);
});
