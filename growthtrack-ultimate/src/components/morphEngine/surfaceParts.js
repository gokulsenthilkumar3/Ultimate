import {DoubleSide,MeshPhysicalMaterial,Vector2} from 'three';
import {HUMAN_SURFACE} from '../../lib/humanSurface';
import {deriveEyeFrames} from './eyeMaterial';

export function configureSurfaceParts(parts,features,{nailColor}={}){
  const eyes=features?.find(f=>f.feature==='eyes')?.mesh,frames=eyes && deriveEyeFrames(eyes.geometry),restores=[];
  for(const {mesh,part} of parts || []){
    const original=mesh.material,settings=part==='nails'?HUMAN_SURFACE.nails:part==='cornea'?HUMAN_SURFACE.cornea:HUMAN_SURFACE.tearline;
    const material=new MeshPhysicalMaterial({color:part==='cornea'?'#000000':part==='nails' && /^#[\da-f]{6}$/i.test(nailColor || '')?nailColor:settings.color || '#ffffff',
      roughness:settings.roughness,metalness:0,clearcoat:part==='nails'?settings.clearcoat:part==='cornea'?0:1,clearcoatRoughness:settings.roughness,
      ior:part==='cornea'?settings.ior:1.45,specularIntensity:part==='cornea' ? .35 : 1,envMapIntensity:part==='cornea' ? .35 : 1,
      // This thin wet film adds only a restrained reflection. A white diffuse
      // plate and a second clearcoat lobe obscured the iris and pupil. Full
      // volume refraction still needs a calibrated closed corneal asset.
      transparent:part==='cornea',opacity:part==='cornea' ? .04 : 1,depthWrite:part!=='cornea',side:DoubleSide});
    if(part==='cornea' && frames){
      material.forceSinglePass=true;
      const gaze={value:new Vector2()};material.userData.gaze=gaze;
      material.onBeforeCompile=shader=>{
        Object.assign(shader.uniforms,{uWetGaze:gaze,uWetLeft:{value:frames.frames[0].pivot},uWetRight:{value:frames.frames[1].pivot},uWetSplit:{value:frames.split}});
        shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
          uniform vec2 uWetGaze;uniform vec3 uWetLeft;uniform vec3 uWetRight;uniform float uWetSplit;
          mat3 wetRotation(){float y=uWetGaze.x,p=uWetGaze.y;return mat3(cos(y),0.0,-sin(y),0.0,1.0,0.0,sin(y),0.0,cos(y))*mat3(1.0,0.0,0.0,0.0,cos(p),sin(p),0.0,-sin(p),cos(p));}`)
          .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal=wetRotation()*objectNormal;')
          .replace('#include <morphtarget_vertex>',`#include <morphtarget_vertex>
            vec3 pivot=position.x<uWetSplit?uWetLeft:uWetRight;transformed=pivot+wetRotation()*(transformed-pivot);`);
      };
      material.customProgramCacheKey=()=> 'growthtrack-cornea-v1';
    }
    mesh.material=material;mesh.castShadow=part==='nails';mesh.receiveShadow=false;
    restores.push(()=>{if(mesh.material===material)mesh.material=original;material.dispose();});
  }
  return ()=>restores.forEach(restore=>restore());
}
export function updateSurfaceParts(parts,body,blink,gaze,renderMode){
  for(const {mesh,part} of parts || []){
    mesh.visible=renderMode==='normal' && (part!=='cornea' || blink<.97);
    if(part==='cornea')mesh.material.userData.gaze?.value.set(gaze?.yaw || 0,gaze?.pitch || 0);
  }
  if(body)body.userData.surfaceParts=(parts || []).map(({mesh,part})=>({part,visible:mesh.visible,vertices:mesh.geometry.attributes.position.count,
    material:mesh.material.type,ior:mesh.material.ior,nails:mesh.userData.nails?.length || 0}));
}
export function freezeSurfaceParts(parts,body,blink,renderMode){
  const old=(parts || []).map(({mesh})=>({mesh,visible:mesh.visible,gaze:mesh.material.userData.gaze?.value.clone()}));
  const hadEvidence=body && Object.prototype.hasOwnProperty.call(body.userData,'surfaceParts'),evidence=body?.userData.surfaceParts;
  updateSurfaceParts(parts,body,blink,{yaw:0,pitch:0},renderMode);
  return()=>{
    for(const {mesh,visible,gaze} of old){mesh.visible=visible;if(gaze)mesh.material.userData.gaze?.value.copy(gaze);}
    if(body){if(hadEvidence)body.userData.surfaceParts=evidence;else delete body.userData.surfaceParts;}
  };
}
