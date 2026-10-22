// @vitest-environment node
import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {Color,Mesh,Object3D,Matrix4,Vector3} from 'three';
import {readGlb,readAccessor,readImage} from '../../../scripts/plan-preview/glb.mjs';
import {RIG_GROUPS} from '../../../docs/real-human-3d/code/anatomy-spec.mjs';
import {glbMeshFixture} from '../../tests/helpers/glbMeshFixture';
import {glbSkeletonFixture} from '../../tests/helpers/glbSkeletonFixture';
import {resolveRigBones} from './boneMap';
import {applyJointPose} from './poseRuntime';
import {createMorphRig} from './morphRig';
import {createSkinnedBoundsUpdater} from './skinnedBounds';
import {MeshBVH} from 'three-mesh-bvh';
import {HUMAN_SURFACE} from '../../lib/humanSurface';

const files=['humanoid-preview-75.glb','humanoid-preview-75-lite.glb'];
const digest=data=>createHash('sha256').update(Buffer.from(data.buffer,data.byteOffset,data.byteLength)).digest('hex');
function fixture(file){
  const {root,skeleton}=glbSkeletonFixture(file),source=glbMeshFixture(file).body,body=source;root.add(body);body.bind(skeleton);
  const bones=Object.fromEntries(Object.entries(resolveRigBones(skeleton)).map(([key,bone])=>[key,bone?{bone,rest:bone.quaternion.clone(),restScale:bone.scale.clone()}:null]));
  return {root,skeleton,body,bones};
}
it.each(files)('adds real rig and surface data while retaining source positions, topology, morphs and images in %s',file=>{
  const output=readGlb(`public/assets/models/${file}`),source=readGlb(`public/assets/models/${file.includes('-lite')?'humanoid-adult-v2-lite.glb':'humanoid-adult-v2.glb'}`);
  const jointNames=output.json.skins[0].joints.map(id=>output.json.nodes[id].name);
  expect(jointNames).toHaveLength(79);expect(Object.values(RIG_GROUPS).flat().every(name=>jointNames.includes(name))).toBe(true);
  const body=output.json.meshes.find(m=>m.name==='GrowthTrackBody'),old=source.json.meshes.find(m=>m.name==='GrowthTrackBody');
  for(const key of ['POSITION','NORMAL','TEXCOORD_0'])expect(digest(readAccessor(output,body.primitives[0].attributes[key]).data)).toBe(digest(readAccessor(source,old.primitives[0].attributes[key]).data));
  expect(digest(readAccessor(output,body.primitives[0].indices).data)).toBe(digest(readAccessor(source,old.primitives[0].indices).data));
  for(let i=0;i<58;i++)expect(digest(readAccessor(output,body.primitives[0].targets[i].POSITION).data)).toBe(digest(readAccessor(source,old.primitives[0].targets[i].POSITION).data));
  for(let i=0;i<source.json.images.length;i++)expect(digest(readImage(output,i))).toBe(digest(readImage(source,i)));
  for(const key of ['TANGENT','_TILE','_REGION','_MICROSCALE'])expect(body.primitives[0].attributes[key]).toBeTypeOf('number');
  expect(body.extras.growthtrack.articulation.boundDigitVertices).toBeGreaterThan(500);
  expect(output.json.meshes.find(m=>m.name==='GrowthTrackNails').extras.nails).toHaveLength(20);
  for(const [name,settings] of [['Nails',HUMAN_SURFACE.nails],['Tearline',HUMAN_SURFACE.tearline]]){
    const actual=output.json.materials.find(m=>m.name===`GrowthTrack${name}Material`).pbrMetallicRoughness.baseColorFactor;
    expect(actual.slice(0,3)).toEqual(new Color(settings.color).toArray());
  }
});
it.each(files)('projects every nail onto real skin and gives cornea triangles an outward facing surface in %s',file=>{
  const output=readGlb(`public/assets/models/${file}`),{body}=glbMeshFixture(file),geometry=body.geometry.clone();geometry.morphAttributes={};
  const bvh=new MeshBVH(geometry,{indirect:true}),nails=output.json.meshes.find(m=>m.name==='GrowthTrackNails'),points=readAccessor(output,nails.primitives[0].attributes.POSITION).data,p=new Vector3();
  for(let i=0;i<points.length;i+=3){p.fromArray(points,i);expect(bvh.closestPointToPoint(p).distance).toBeLessThan(.0005);}
  const cornea=output.json.meshes.find(m=>m.name==='GrowthTrackCornea'),normals=readAccessor(output,cornea.primitives[0].attributes.NORMAL).data;
  for(let i=2;i<normals.length;i+=3)expect(normals[i]).toBeGreaterThan(0);
  geometry.dispose();
});
it.each(files)('moves bound finger and toe skin, supports pointing and returns to neutral in %s',file=>{
  const {body,bones,root,skeleton}=fixture(file),position=body.geometry.attributes.position;
  applyJointPose(bones,{enabled:true,joints:{},targets:{},digits:{leftHand:{shape:'fist',strength:1},rightHand:{shape:'point',strength:1},leftFoot:{curl:.6}}});
  root.updateMatrixWorld(true);skeleton.update();
  expect(bones.LeftIndex1.bone.quaternion.angleTo(bones.LeftIndex1.rest)).toBeGreaterThan(.5);
  expect(bones.RightIndex1.bone.quaternion.angleTo(bones.RightIndex1.rest)).toBeLessThan(1e-7);
  expect(bones.RightMiddle2.bone.quaternion.angleTo(bones.RightMiddle2.rest)).toBeGreaterThan(.5);
  expect(bones.LeftToeBig1.bone.quaternion.angleTo(bones.LeftToeBig1.rest)).toBeGreaterThan(.2);
  let moved=0;const point=new Vector3();
  for(let i=0;i<position.count;i++){body.getVertexPosition(i,point);expect(point.toArray().every(Number.isFinite)).toBe(true);if(point.distanceTo(new Vector3().fromBufferAttribute(position,i))>.002)moved++;}
  expect(moved).toBeGreaterThan(200);
  applyJointPose(bones,null);root.updateMatrixWorld(true);
  for(let i=0;i<position.count;i++)expect(body.getVertexPosition(i,point).distanceTo(new Vector3().fromBufferAttribute(position,i))).toBeLessThan(1e-6);
});
it.each(files)('moves morph-dependent pivots without translating neutral skin twice, then keeps posed bounds valid in %s',file=>{
  const {body,bones,root}=fixture(file),updateRig=createMorphRig(body),updateBounds=createSkinnedBoundsUpdater(body);
  root.scale.set(.9,1.3,1.1);root.rotation.y=.4;root.updateMatrixWorld(true);
  const before=bones.LeftIndex3.bone.position.clone();
  for(const [name,value] of [['hand_length',1],['upper_arm_length',.6],['leg_length',.5]])body.morphTargetInfluences[body.morphTargetDictionary[name]]=value;
  updateRig();updateBounds();expect(bones.LeftIndex3.bone.position.distanceTo(before)).toBeGreaterThan(.0001);
  const plain=new Mesh(body.geometry);plain.morphTargetInfluences=body.morphTargetInfluences.slice();
  const a=new Vector3(),b=new Vector3();
  for(let i=0;i<body.geometry.attributes.position.count;i++)expect(body.getVertexPosition(i,a).distanceTo(plain.getVertexPosition(i,b))).toBeLessThan(1e-5);
  applyJointPose(bones,{enabled:true,joints:{leftUpperArm:[0,0,60]},targets:{leftWrist:[.2,-.6,.3]},digits:{leftHand:{shape:'fist',strength:.6}}});updateBounds();
  for(let i=0;i<body.geometry.attributes.position.count;i++){body.getVertexPosition(i,a);expect(body.boundingBox.containsPoint(a)).toBe(true);}
  expect(body.userData.morphRig).toMatchObject({joints:79,active:3});
});
it.each(files)('compensates rigid head attachments so morph-dependent pivots cannot move them twice in %s',file=>{
  const {body,bones,root,skeleton}=fixture(file),attachment=new Object3D();attachment.position.set(.02,.03,.1);bones.head.bone.add(attachment);root.updateMatrixWorld(true);
  const original=attachment.getWorldPosition(new Vector3()),update=createMorphRig(body),headIndex=skeleton.bones.indexOf(bones.head.bone);
  body.morphTargetInfluences[body.morphTargetDictionary.torso_length]=1;update();root.updateMatrixWorld(true);
  expect(attachment.getWorldPosition(new Vector3()).distanceTo(original)).toBeLessThan(1e-6);
  applyJointPose(bones,{enabled:true,joints:{head:[0,30,0]},targets:{}});root.updateMatrixWorld(true);
  const expected=original.clone().applyMatrix4(new Matrix4().multiplyMatrices(bones.head.bone.matrixWorld,skeleton.boneInverses[headIndex]));
  expect(attachment.getWorldPosition(new Vector3()).distanceTo(expected)).toBeLessThan(1e-6);
});
