import {expect,it,vi} from 'vitest';
import {Mesh,MeshBasicMaterial,SphereGeometry,Vector2} from 'three';
import {configureSurfaceParts,freezeSurfaceParts,updateSurfaceParts} from './surfaceParts';
import {HUMAN_SURFACE} from '../../lib/humanSurface';

it('keeps wet layers and nails separate, hides the cornea on closure and restores capture state',()=>{
  const parts=['cornea','tearline','nails'].map(part=>({part,mesh:new Mesh(new SphereGeometry(),new MeshBasicMaterial())}));
  const originals=parts.map(p=>p.mesh.material),body={userData:{}};
  const dispose=configureSurfaceParts(parts,[],{nailColor:'#aabbcc'});
  expect(parts[0].mesh.material.ior).toBe(HUMAN_SURFACE.cornea.ior);
  expect(parts[0].mesh.material.depthWrite).toBe(false);
  expect(parts[0].mesh.material.color.getHex()).toBe(0);
  expect(parts[0].mesh.material.opacity).toBeLessThan(.05);
  expect(parts[0].mesh.material.clearcoat).toBe(0);
  expect(parts[2].mesh.material.color.getHexString()).toBe('aabbcc');
  parts[0].mesh.material.userData.gaze={value:new Vector2(.2,-.1)};
  updateSurfaceParts(parts,body,.4,{yaw:.2,pitch:-.1},'normal');
  const evidence=body.userData.surfaceParts;
  const restore=freezeSurfaceParts(parts,body,1,'normal');
  expect(parts[0].mesh.visible).toBe(false);expect(parts[1].mesh.visible).toBe(true);
  expect(parts[0].mesh.material.userData.gaze.value.toArray()).toEqual([0,0]);
  restore();expect(parts[0].mesh.visible).toBe(true);expect(parts[0].mesh.material.userData.gaze.value.toArray()).toEqual([.2,-.1]);
  expect(body.userData.surfaceParts).toBe(evidence);expect(body.userData.surfaceParts[0].visible).toBe(true);
  updateSurfaceParts(parts,body,0,{},'wireframe');expect(parts.every(p=>!p.mesh.visible)).toBe(true);
  const listeners=parts.map(p=>vi.fn().mockName(p.part));parts.forEach((p,i)=>p.mesh.material.addEventListener('dispose',listeners[i]));
  dispose();parts.forEach((p,i)=>{expect(p.mesh.material).toBe(originals[i]);expect(listeners[i]).toHaveBeenCalledOnce();p.mesh.geometry.dispose();p.mesh.material.dispose();});
});
