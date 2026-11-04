// @vitest-environment node
import {describe,it,expect} from 'vitest';
import {resolve} from 'node:path';
import {readGlb,readAccessor,readImage} from '../../scripts/plan-preview/glb.mjs';
import {BufferGeometry,DoubleSide,Float32BufferAttribute,Mesh,MeshBasicMaterial,Raycaster,Vector3} from 'three';
import {glbMeshFixture} from './helpers/glbMeshFixture';
import {createPrivateAnatomyDeformer} from '../components/morphEngine/anatomyDeformation';

const bytes=array=>Buffer.from(array.buffer,array.byteOffset,array.byteLength);
const sameAccessor=(a,ai,b,bi)=>expect(bytes(readAccessor(a,ai).data).equals(bytes(readAccessor(b,bi).data))).toBe(true);

describe.each([['humanoid-base.glb','humanoid-adult-v2.glb'],['humanoid-base-lite.glb','humanoid-adult-v2-lite.glb']])('assessed human upgrade %s', (source,upgraded)=> {
  it('keeps the root embedded while body mass, abdomen and pelvis morphs change',()=> {
    const {body,anatomy}=glbMeshFixture(upgraded),d=createPrivateAnatomyDeformer(anatomy,body),caster=new Raycaster();
    const material=new MeshBasicMaterial({side:DoubleSide}),geometry=new BufferGeometry();geometry.setIndex(body.geometry.index);
    const surface=new Mesh(geometry,material);surface.updateMatrixWorld(true);
    for(const changes of [{overall_mass:1},{gut_volume:1},{pelvis_width:1},{hip_width:1},{glute_volume:1},{torso_length:1},{leg_length:1},{corrective_abdomen_waist:1},{overall_mass:.7,gut_volume:.8,pelvis_width:.6}]) {
      const positions=body.geometry.attributes.position.array.slice();
      for(const [name,weight] of Object.entries(changes)) {
        const index=body.morphTargetDictionary[name];if(index==null)continue;
        const delta=body.geometry.morphAttributes.position[index].array;
        for(let i=0;i<positions.length;i++)positions[i]+=delta[i]*weight;
      }
      geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.computeBoundingSphere();
      for(const state of ['resting','erect']) {
        d.apply({penis:{[state]:{measurements:{lengthCm:18,baseCircumferenceCm:14,midCircumferenceCm:13}}}},{state});
        for(let k=0;k<anatomy.userData.layout.segments;k+=16) {
          const p=new Vector3().fromBufferAttribute(anatomy.geometry.attributes.position,k);
          for(const [name,weight] of Object.entries(changes)) {
            const index=anatomy.morphTargetDictionary[name];if(index!=null)p.addScaledVector(new Vector3().fromBufferAttribute(anatomy.geometry.morphAttributes.position[index],k),weight);
          }
          caster.set(new Vector3(p.x,p.y,1),new Vector3(0,0,-1));
          const hit=caster.intersectObject(surface,false)[0];
          expect(hit,`${state} ${JSON.stringify(changes)} root ${k}`).toBeDefined();
          expect((p.z-hit.point.z)/d.unit,`${state} ${JSON.stringify(changes)} root ${k}`).toBeLessThan(.05);
        }
      }
    }
    geometry.dispose();material.dispose();
  },30000);
  it('preserves all assessed surfaces, image bytes, body morphs and calibrated private sections',()=> {
    const a=readGlb(resolve('public/assets/models',source)),b=readGlb(resolve('public/assets/models',upgraded));
    expect(b.json.images).toHaveLength(a.json.images.length);
    a.json.images.forEach((_,i)=>expect(readImage(a,i).equals(readImage(b,i))).toBe(true));
    expect(b.json.materials).toEqual(a.json.materials);
    expect(b.json.nodes).toEqual(a.json.nodes);
    a.json.skins.forEach((skin,i)=> {
      expect(b.json.skins[i].joints).toEqual(skin.joints);
      sameAccessor(a,skin.inverseBindMatrices,b,b.json.skins[i].inverseBindMatrices);
    });
    for(const mesh of a.json.meshes) {
      const next=b.json.meshes.find(m=>m.name===mesh.name),ap=mesh.primitives[0],bp=next.primitives[0];
      if(mesh.name!=='GrowthTrackPrivateAnatomy') {
        expect(next.extras.targetNames).toEqual(mesh.extras.targetNames);
        for(const key of Object.keys(ap.attributes))sameAccessor(a,ap.attributes[key],b,bp.attributes[key]);
        for(let i=0;i<(ap.targets||[]).length;i++)sameAccessor(a,ap.targets[i].POSITION,b,bp.targets[i].POSITION);
      } else {
        const body=b.json.meshes.find(m=>m.name==='GrowthTrackBody');
        expect(next.extras.targetNames).toEqual(expect.arrayContaining(body.extras.targetNames));
        expect(next.extras.attachmentUpgrade).toMatchObject({boundVertices:961,bodyMorphs:58,visibleMeasurementRingsPreserved:true});
        const original=readAccessor(a,ap.attributes.POSITION).data,updated=readAccessor(b,bp.attributes.POSITION).data;
        const {segments,baseRing,tipVertex}=next.extras.layout;
        expect(bytes(updated.subarray(baseRing*segments*3,(tipVertex+1)*3)).equals(bytes(original.subarray(baseRing*segments*3,(tipVertex+1)*3)))).toBe(true);
        for(const name of ['d_length','d_girth'])sameAccessor(a,ap.targets[mesh.extras.targetNames.indexOf(name)].POSITION,b,bp.targets[next.extras.targetNames.indexOf(name)].POSITION);
        const weights=readAccessor(b,bp.attributes.WEIGHTS_0).data;
        for(let i=0;i<weights.length;i+=4)expect(weights[i]+weights[i+1]+weights[i+2]+weights[i+3]).toBeCloseTo(1,5);
        sameAccessor(a,ap.attributes.TEXCOORD_0,b,bp.attributes.TEXCOORD_0);
      }
      sameAccessor(a,ap.indices,b,bp.indices);
    }
  });
});
