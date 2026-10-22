// @vitest-environment node
import {expect,it} from 'vitest';
import {Box3,BufferGeometry,Float32BufferAttribute,Vector3} from 'three';
import {MeshBVH} from 'three-mesh-bvh';
import {readGlb} from '../../../scripts/plan-preview/glb.mjs';
import {sceneFromGlb} from '../../../scripts/human75/glb-tools.mjs';
import {resolveRigBones} from './boneMap';
import {applyJointPose} from './poseRuntime';
import {createMorphRig} from './morphRig';
import {scopeFacialMorphs} from './facialMorphScope';
import {prepareEyelidCorrective} from './eyelidCorrective';

const files=['humanoid-preview-75.glb','humanoid-preview-75-lite.glb'];
function fixture(file){
  const scene=sceneFromGlb(readGlb(`public/assets/models/${file}`)),{body,skeleton}=scene;
  scopeFacialMorphs(body);prepareEyelidCorrective(body,scene.features);
  const bones=Object.fromEntries(Object.entries(resolveRigBones(skeleton)).map(([key,bone])=>[key,bone?{bone,rest:bone.quaternion.clone(),restScale:bone.scale.clone()}:null]));
  return {...scene,bones,morphRig:createMorphRig(body)};
}
function pose(scene,{morphs={},joints={},digits={}}={}){
  applyJointPose(scene.bones,null);scene.root.updateMatrixWorld(true);
  for(const mesh of scene.meshes){mesh.morphTargetInfluences.fill(0);for(const [name,value] of Object.entries(morphs))if(mesh.morphTargetDictionary[name]!=null)mesh.morphTargetInfluences[mesh.morphTargetDictionary[name]]=value;}
  scene.morphRig();applyJointPose(scene.bones,{enabled:true,joints,targets:{},digits});scene.root.updateMatrixWorld(true);scene.skeleton.update();
}
function surfaceDistance(scene,mesh){
  const {body}=scene,points=new Float32Array(body.geometry.attributes.position.count*3),p=new Vector3();
  for(let i=0;i<points.length/3;i++){body.getVertexPosition(i,p);points.set(p.toArray(),i*3);}
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(points,3));geometry.setIndex(body.geometry.index.clone());
  const bvh=new MeshBVH(geometry,{indirect:true});let maximum=0;
  for(let i=0;i<mesh.geometry.attributes.position.count;i++){
    mesh.getVertexPosition(i,p);p.applyMatrix4(mesh.matrixWorld);body.worldToLocal(p);
    maximum=Math.max(maximum,bvh.closestPointToPoint(p).distance);
  }
  geometry.dispose();return maximum;
}
it.each(files)('keeps raw cornea in the eye transform through head turns and morphs in %s',file=>{
  const scene=fixture(file),eyes=scene.features.find(f=>f.feature==='eyes').mesh,cornea=scene.meshes.find(m=>m.name==='GrowthTrackCornea');
  const eyeBounds=new Box3().setFromBufferAttribute(eyes.geometry.attributes.position),capBounds=new Box3().setFromBufferAttribute(cornea.geometry.attributes.position);
  // The cap is authored in the same coordinates as the eye front. A matching
  // rest parent transform is essential even without application fit helpers.
  expect(Math.abs(capBounds.getCenter(new Vector3()).y-eyeBounds.getCenter(new Vector3()).y)).toBeLessThan(.001);
  for(const state of [{},{morphs:{torso_length:.8,neck_length:.5},joints:{head:[12,35,7]}}]){
    pose(scene,state);
    const a=cornea.matrixWorld.elements,b=eyes.matrixWorld.elements;
    expect(Math.max(...a.map((value,i)=>Math.abs(value-b[i])))).toBeLessThan(1e-7);
  }
});
it.each(files)('keeps the entire tearline on posed and morphed eyelid skin in %s',file=>{
  const scene=fixture(file),tearline=scene.meshes.find(m=>m.name==='GrowthTrackTearline');
  for(const state of [{},{morphs:{head_circumference:.8,eye_size:.65,brow_depth:.5}},{joints:{head:[12,-35,7]}},{morphs:{blink:1}}]){
    pose(scene,state);
    // The JSON clearance is 0.192 mm on this measured eye width. Allow a
    // 0.5 mm envelope for barycentric skin interpolation at a posed seam.
    expect(surfaceDistance(scene,tearline)).toBeLessThan(.0005);
  }
});
it.each(files)('keeps nail patches attached during full finger and toe motion in %s',file=>{
  const scene=fixture(file),nails=scene.meshes.find(m=>m.name==='GrowthTrackNails');
  for(const state of [
    {digits:{leftHand:{shape:'fist',strength:1},rightHand:{shape:'point',strength:1},leftFoot:{curl:1},rightFoot:{curl:-.3}}},
    {morphs:{hand_length:1,foot_length:1},digits:{leftHand:{shape:'point',strength:1},rightHand:{shape:'fist',strength:1},leftFoot:{curl:.8},rightFoot:{curl:.8}}},
  ]){pose(scene,state);expect(surfaceDistance(scene,nails)).toBeLessThan(.0005);}
});
