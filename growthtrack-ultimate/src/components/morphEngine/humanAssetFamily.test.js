// @vitest-environment node
import {beforeAll,describe,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import {BufferAttribute,MeshBasicMaterial,Vector3} from 'three';
import validator from 'gltf-validator';
import {readGlb,readAccessor} from '../../../scripts/plan-preview/glb.mjs';
import {sceneFromGlb} from '../../../scripts/human75/glb-tools.mjs';
import {decompressGlb,packGlb,sha256} from '../../../scripts/human-realism/glb-family.mjs';
import {attachNativeAnatomy} from './useNativeAnatomy';
import {resolveModelAsset} from './modelAssetRegistry';
import {anatomicalBodyExportIndex} from './anatomyTissueGeometry';
import {protectAvatarCapture} from './protectedCapture';
import manifest from '../../config/humanAssetManifest.json';
import family from '../../config/humanAssetFamily.json';

const decoded={};
function sceneWithCustomAttributes(glb){
  const result=sceneFromGlb(glb);
  result.meshes.forEach((mesh,i)=>{
    for(const [key,id] of Object.entries(glb.json.meshes[i].primitives[0].attributes))if(key.startsWith('_')){
      const a=readAccessor(glb,id);mesh.geometry.setAttribute(key.toLowerCase(),new BufferAttribute(a.data,a.width));
    }
  });
  return result;
}
function fixture(lod='core'){
  const publicScene=sceneWithCustomAttributes(decoded[lod].public);
  const privateScene=sceneWithCustomAttributes(decoded[lod].private);
  const asset={...manifest.assets[lod],lod};
  const attachment=attachNativeAnatomy({scene:privateScene.root},publicScene.body,asset);
  return {...publicScene,attachment,asset};
}
beforeAll(async()=>{
  for(const lod of ['core','hero']){
    it(lod+' updates still tissue materials without disposing shared diagnostic materials',()=>{
      const {body,attachment}=fixture(lod);attachment.deformer.apply({});
      const first=new MeshBasicMaterial(),second=new MeshBasicMaterial(),dispose=vi.spyOn(first,'dispose'),secondDispose=vi.spyOn(second,'dispose');
      body.material=attachment.mesh.material=first;
      expect(attachment.deformer.updateDetails()).toBe(true);
      const patch=attachment.mesh.getObjectByName('PrivateAnatomyPelvicTransition');
      expect(patch.material).toBe(first);expect(attachment.deformer.updateDetails()).toBe(false);
      body.material=attachment.mesh.material=second;
      expect(attachment.deformer.updateDetails()).toBe(true);expect(patch.material).toBe(second);
      expect(dispose).not.toHaveBeenCalled();attachment.dispose();expect(secondDispose).not.toHaveBeenCalled();
      first.dispose();second.dispose();
    });
    const a=manifest.assets[lod];
    decoded[lod]={public:await decompressGlb(readGlb('public/assets/models/'+a.file)),private:await decompressGlb(readGlb('public/assets/models/'+a.privateFile))};
  }
},30000);

describe('actual R2 asset family',()=>{
  for(const lod of ['core','hero']){
    it(lod+' validates decoded geometry, matches its provenance and meets payload budgets',async()=>{
      const a=manifest.assets[lod],budgets=family.budgets;
      expect(fs.statSync('public/assets/models/'+a.file).size).toBeLessThanOrEqual(budgets[lod+'Bytes']);
      expect(sha256(fs.readFileSync('public/assets/models/'+a.file))).toBe(a.sha256);
      expect(sha256(fs.readFileSync('public/assets/models/'+a.privateFile))).toBe(a.privateSha256);
      for(const g of [decoded[lod].public,decoded[lod].private]){
        const report=await validator.validateBytes(new Uint8Array(packGlb(g.json,g.bin)),{maxIssues:0});
        expect([...new Set(report.issues.messages.filter(m=>m.severity===0).map(m=>m.code+' '+m.pointer))]).toEqual([]);
      }
    },30000);
    it(lod+' public binary contains no private meshes, orphaned private accessors or private nodes',()=>{
      const g=decoded[lod].public,publicJson=JSON.stringify(g.json);
      expect(/privateanatomy|controlCage|removedBodyTriangles|nativeBinding/i.test(publicJson)).toBe(false);
      const used=new Set();
      for(const m of g.json.meshes)for(const p of m.primitives){
        Object.values(p.attributes).forEach(id=>used.add(id));used.add(p.indices);
        for(const t of p.targets || [])Object.values(t).forEach(id=>used.add(id));
      }
      for(const skin of g.json.skins)used.add(skin.inverseBindMatrices);
      expect(used.size).toBe(g.json.accessors.length);
      const body=g.json.meshes.find(m=>m.name==='GrowthTrackBody');
      expect(body.extras.targetNames).toContain('jaw_open');
      expect(body.extras.growthtrack.nativeFamily).toBe(family.id);
      const cornea=g.json.meshes.find(m=>m.name==='GrowthTrackCornea');
      expect(g.json.materials[cornea.primitives[0].material].pbrMetallicRoughness.baseColorFactor).toEqual([0,0,0,.04]);
      const hair=g.json.meshes.find(m=>m.name==='GrowthTrackHair');
      expect(hair.extras.authoredGroom.rootMethod).toBe('actual-scalp-triangle-frames');
      const eyes=g.json.meshes.find(m=>m.name==='GrowthTrackEyes');
      expect(eyes.extras.bakedIris.method).toBe('front-surface-vertex-pigment');
      const pigment=readAccessor(g,eyes.primitives[0].attributes.COLOR_0).data;
      expect(Math.min(...pigment)).toBeLessThan(.005);
    });
    it(lod+' reveals a native surface, restores the public body and keeps public export intact',()=>{
      const {body,attachment}=fixture(lod),intact=body.geometry.index,authoredCount=attachment.mesh.geometry.attributes.position.count;
      const evidence=attachment.deformer.apply({penis:{resting:{measurements:{lengthCm:12,midCircumferenceCm:10}}}});
      expect(attachment.mesh.isSkinnedMesh).not.toBe(true);
      expect(attachment.cage.isSkinnedMesh).toBe(true);
      expect(evidence.measurementSurface).toBe('rendered-native-surface');
      expect(attachment.mesh.geometry.attributes.position.count).toBe(authoredCount);
      attachment.mesh.visible=true;
      expect(body.geometry.index.count).toBeLessThan(intact.count);
      expect(anatomicalBodyExportIndex(body)).toBe(intact);
      const revealed=body.geometry.index;
      const restore=protectAvatarCapture({body,privateMesh:attachment.mesh,material:body.material,wardrobe:'ANATOMICAL'});
      expect(body.geometry.index).toBe(intact);
      expect(attachment.mesh.visible).toBe(false);
      restore();
      expect(body.geometry.index).toBe(revealed);
      attachment.mesh.visible=false;
      expect(body.geometry.index).toBe(intact);
      attachment.dispose();
      expect(body.geometry.index).toBe(intact);
    });
  }
  it('does not mutate the six retained assets',()=>{
    const record=JSON.parse(fs.readFileSync('docs/real-human-3d/data/human-r2/asset-build.json'));
    expect(Object.keys(record.retainedAssets)).toHaveLength(6);
    for(const [file,hash] of Object.entries(record.retainedAssets))expect(sha256(fs.readFileSync(file))).toBe(hash);
  });
  it('routes male candidate LODs and leaves other model selections covered',()=>{
    expect(resolveModelAsset({modelVersion:'human-r2',modelPreset:'male'},'HIGH')).toMatchObject({nativeFamily:family.id,lod:'hero'});
    expect(resolveModelAsset({modelVersion:'human-r2',modelPreset:'male'},'LOW')).toMatchObject({nativeFamily:family.id,lod:'core'});
    expect(resolveModelAsset({modelVersion:'human-r2',modelPreset:'female'},'HIGH').nativeFamily).toBeUndefined();
  });
  it('keeps Current and Goal geometry, rig buffers and independent states isolated',()=>{
    const first=fixture(),second=fixture(),before=second.attachment.mesh.geometry.attributes.position.array.slice();
    expect(first.body.skeleton.boneInverses[0]).not.toBe(second.body.skeleton.boneInverses[0]);
    first.attachment.deformer.apply({penis:{erect:{measurements:{lengthCm:16,midCircumferenceCm:8}}}},{state:'erect'});
    expect(Array.from(second.attachment.mesh.geometry.attributes.position.array)).toEqual(Array.from(before));
    expect(first.attachment.mesh.geometry.attributes.position.array.every(Number.isFinite)).toBe(true);
    first.attachment.dispose();second.attachment.dispose();
  });
  it('moves authored offsets with a posed triangle without double skinning',()=>{
    const {body,attachment}=fixture(),g=attachment.mesh.geometry,p=g.attributes.position;
    attachment.deformer.apply({});
    const initial=p.array.slice(),bone=body.skeleton.bones[0];
    bone.position.x+=.04;body.parent.updateMatrixWorld(true);body.skeleton.update();
    attachment.deformer.updateDetails();
    const displacement=new Vector3(p.getX(0)-initial[0],p.getY(0)-initial[1],p.getZ(0)-initial[2]);
    expect(displacement.x).toBeCloseTo(.04,4);
    expect(Math.abs(displacement.y)).toBeLessThan(.0001);
    expect(Math.abs(displacement.z)).toBeLessThan(.0001);
    attachment.dispose();
  });
  it('rejects a package from another body before making a hole',()=>{
    const publicScene=sceneWithCustomAttributes(decoded.core.public),privateScene=sceneWithCustomAttributes(decoded.hero.private);
    const intact=publicScene.body.geometry.index;
    expect(()=>attachNativeAnatomy({scene:privateScene.root},publicScene.body,{...manifest.assets.core,lod:'core'})).toThrow(/Incompatible/);
    expect(publicScene.body.geometry.index).toBe(intact);
  });
});
