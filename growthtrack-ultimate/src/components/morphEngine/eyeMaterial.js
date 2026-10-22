import { Box3, Color, DoubleSide, MeshPhysicalMaterial, Vector2, Vector3, Vector4 } from 'three';
import { EYE_APPEARANCE, advancePupil, pupilDiameterForExposure, resolveEyeAppearance } from '../../lib/eyeAppearance';
import { appearanceHash } from '../../lib/appearanceDetail';

/** Derive the iris planes from this asset's rest positions, not screen pixels
 * or fixed head coordinates. The bundled eye mesh faces local positive Z. */
export function deriveEyeFrames(geometry) {
  const position = geometry.attributes.position;
  const all = new Box3().setFromBufferAttribute(position);
  const split = all.getCenter(new Vector3()).x;
  const bounds = [new Box3(), new Box3()], point = new Vector3();
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i); bounds[point.x < split ? 0 : 1].expandByPoint(point);
  }
  const frames = bounds.map((box, side) => {
    const pivot = box.getCenter(new Vector3()), size = box.getSize(new Vector3());
    const front = new Vector2(); let count = 0;
    const threshold = box.max.z - size.z * EYE_APPEARANCE.shader.frontCapFraction;
    for (let i = 0; i < position.count; i++) {
      if ((position.getX(i) < split ? 0 : 1) === side && position.getZ(i) >= threshold) {
        front.x += position.getX(i); front.y += position.getY(i); count++;
      }
    }
    if (count) front.divideScalar(count); else front.set(pivot.x, pivot.y);
    return { pivot, surface: new Vector4(front.x, front.y, pivot.z, Math.max(Number.EPSILON, Math.min(size.x, size.y) / 2)), frontVertices: count };
  });
  return { split, frames };
}

export function updateEyePupil(material, exposure, delta, immediate = false) {
  const pupil = material?.userData?.pupil;
  if (!pupil) return;
  pupil.target = pupilDiameterForExposure(pupil.appearance, exposure);
  pupil.value = advancePupil(pupil.value, pupil.target, delta, immediate);
  material.userData.eyeUniforms.uEyePupil.value = pupil.value / EYE_APPEARANCE.shader.irisDiameterMm;
}

/** A still uses the current exposure's settled pupil even if no animation
 * frame has run. The live transition is restored after encoding or failure. */
export function freezeEyePupil(material, exposure) {
  const pupil = material?.userData?.pupil;
  if (!pupil) return () => {};
  const previous = { value: pupil.value, target: pupil.target, uniform: material.userData.eyeUniforms.uEyePupil.value };
  updateEyePupil(material, exposure, 0, true);
  return () => {
    Object.assign(pupil, { value: previous.value, target: previous.target });
    material.userData.eyeUniforms.uEyePupil.value = previous.uniform;
  };
}

export function createEyeMaterial(source, geometry, color=EYE_APPEARANCE.defaults.color, skinNormalMap=null, options={}) {
  const { split, frames } = deriveEyeFrames(geometry);
  const appearance = resolveEyeAppearance({ ...options, eyeColor: color });
  const diameter = pupilDiameterForExposure(appearance, options.exposure ?? EYE_APPEARANCE.response.referenceExposure);
  const material=new MeshPhysicalMaterial({
    // The bundled asset reuses the body's pore normal on the eye UVs. A wet
    // cornea is smooth; retain an authored eye normal only when it is separate.
    map:source?.map || null,normalMap:source?.normalMap===skinNormalMap?null:source?.normalMap || null,
    normalScale:source?.normalScale?.clone?.() || new Vector2(.08,.08),
    color:'#ffffff',roughness:.32,clearcoat:1,clearcoatRoughness:.08,specularIntensity:.3,envMapIntensity:.35,
    metalness:0,ior:1.38,transparent:false,alphaTest:.12,side:DoubleSide,
  });
  const gaze={value:new Vector2()};
  material.userData.gaze=gaze;
  const uniforms = {
    uIrisColor: { value: new Color(appearance.color) },
    uScleraTint: { value: new Color(appearance.scleraColor) },
    uEyePupil: { value: diameter / EYE_APPEARANCE.shader.irisDiameterMm },
    uEyeIrisRadius: { value: EYE_APPEARANCE.shader.irisRadiusRatio },
    uEyeDetail: { value: new Vector3(appearance.detail, Number(appearance.limbalRing), appearance.seed) },
    uIrisPhase: { value: appearanceHash(0, 0, appearance.seed) / 4294967296 * Math.PI * 2 },
  };
  material.userData.eyeUniforms = uniforms;
  material.userData.pupil = { appearance, value: diameter, target: diameter };
  material.userData.eyeFrames = frames;
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms, uniforms);
    shader.uniforms.uEyeGaze=gaze;
    shader.uniforms.uEyeLeft={value:frames[0].pivot};
    shader.uniforms.uEyeRight={value:frames[1].pivot};
    shader.uniforms.uEyeSurfaceLeft={value:frames[0].surface};
    shader.uniforms.uEyeSurfaceRight={value:frames[1].surface};
    shader.uniforms.uEyeSplit={value:split};
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>',`#include <common>
        uniform vec2 uEyeGaze;
        uniform vec3 uEyeLeft;
        uniform vec3 uEyeRight;
        uniform vec4 uEyeSurfaceLeft;
        uniform vec4 uEyeSurfaceRight;
        uniform float uEyeSplit;
        varying vec3 vEyeSurface;
        mat3 eyeRotation() {
          float y=uEyeGaze.x,p=uEyeGaze.y;
          return mat3(cos(y),0.0,-sin(y),0.0,1.0,0.0,sin(y),0.0,cos(y)) *
            mat3(1.0,0.0,0.0,0.0,cos(p),sin(p),0.0,-sin(p),cos(p));
        }`)
      .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal = eyeRotation() * objectNormal;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 eyeSurface=position.x<uEyeSplit?uEyeSurfaceLeft:uEyeSurfaceRight;
        vEyeSurface=(position-eyeSurface.xyz)/eyeSurface.w;`)
      .replace('#include <morphtarget_vertex>',`#include <morphtarget_vertex>
        vec3 eyePivot=position.x<uEyeSplit?uEyeLeft:uEyeRight;
        transformed=eyePivot+eyeRotation()*(transformed-eyePivot);`);
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>',`#include <common>
        uniform vec3 uIrisColor;
        uniform vec3 uScleraTint;
        uniform float uEyePupil;
        uniform float uEyeIrisRadius;
        uniform vec3 uEyeDetail;
        uniform float uIrisPhase;
        varying vec3 vEyeSurface;`)
      .replace('#include <map_fragment>',`#include <map_fragment>
        float irisRadius=length(vEyeSurface.xy)/uEyeIrisRadius;
        float irisAA=max(fwidth(irisRadius),.003);
        float irisAngle=atan(vEyeSurface.y,vEyeSurface.x+1e-7);
        float irisPhase=uIrisPhase;
        float fibreFootprint=abs(fwidth(irisAngle))*${EYE_APPEARANCE.shader.fibreFrequency.toFixed(1)};
        float resolvedFibres=1.0-smoothstep(1.0,3.0,fibreFootprint);
        float fibres=sin(irisAngle*${EYE_APPEARANCE.shader.fibreFrequency.toFixed(1)}+
          sin(irisAngle*${EYE_APPEARANCE.shader.secondaryFrequency.toFixed(1)}+irisPhase)*2.0+irisRadius*16.0+irisPhase);
        float collarette=1.0-smoothstep(.015,.065,abs(irisRadius-${EYE_APPEARANCE.shader.collaretteRadius.toFixed(2)}+sin(irisAngle*18.0+irisPhase)*.025));
        vec3 irisPigment=uIrisColor*(.78+.22*clamp(irisRadius,0.0,1.0));
        irisPigment*=1.0+uEyeDetail.x*(fibres*.22*resolvedFibres-collarette*.18);
        float limbal=smoothstep(${EYE_APPEARANCE.shader.limbalStart.toFixed(2)},1.0,irisRadius)*uEyeDetail.y;
        irisPigment*=1.0-limbal*${EYE_APPEARANCE.shader.limbalStrength.toFixed(2)};
        float pupilCoverage=1.0-smoothstep(uEyePupil-irisAA,uEyePupil+irisAA,irisRadius);
        irisPigment=mix(irisPigment,vec3(${new Color(EYE_APPEARANCE.shader.pupilColor).toArray().map(value => value.toFixed(6)).join(',')}),pupilCoverage);
        float irisCoverage=(1.0-smoothstep(1.0-irisAA,1.0+irisAA,irisRadius))*smoothstep(.1,.4,vEyeSurface.z);
        diffuseColor.rgb=mix(diffuseColor.rgb*uScleraTint,irisPigment,irisCoverage);`);
  };
  material.customProgramCacheKey=()=> 'growthtrack-eye-iris-pupil-v2';
  return material;
}
