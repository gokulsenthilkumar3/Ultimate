/**
 * GrowthTrack Ultimate — Layer 4: VFX / Shaders
 * WardrobeShader.js
 *
 * PBR cloth material system for all 7 wardrobe presets.
 * Used by an owned geometry shell; uncovered regions retain the skin surface.
 *
 * WARDROBE_PRESETS (from Layer 1):
 *   GYM        — compression shorts + tank top (dark navy/charcoal)
 *   CASUAL     — joggers + hoodie (heather grey)
 *   FORMAL     — dress shirt + trousers (white/charcoal)
 *   SWIMWEAR   — board shorts (bold pattern)
 *   UNDERWEAR  — boxer briefs (minimal dark grey)
 *   ANATOMICAL — nude (no cloth shader, falls back to SkinShader)
 *   BODY_COMP  — nude + heatmap overlay (SkinShader + VascularityShader)
 *
 * Each preset defines:
 *   - Primary/secondary colour
 *   - Roughness (cotton = 0.9, synthetic = 0.55, silk = 0.35)
 *   - Sheen amount (fabric micro-fibre gloss)
 *   - Coverage map: which Y-ranges are covered by cloth vs exposed skin
 *   - Procedural weave pattern type: "smooth"|"knit"|"denim"|"jersey"
 *
 * The coverage map is used by ClothCoveragePass to blend the cloth
 * material with the skin material at boundaries (neckline, sleeve edges, etc.).
 *
 * Usage:
 *   import { createClothMaterial, updateClothUniforms, WARDROBE_CONFIGS }
 *     from "./WardrobeShader";
 *
 *   const mat = createClothMaterial("GYM");
 *   mesh.material = mat;
 */

import * as THREE from "three";
import {CLOTHING_FABRICS,wardrobeDefaults} from '../../lib/wardrobePreferences';
import {prepareGarmentAttributes} from './garmentGeometry';
import {authoredGarmentLandmarks,prepareWaistContour} from './authoredGarments';

// ─────────────────────────────────────────────────────────────────────────────
// WARDROBE CONFIGURATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const WARDROBE_CONFIGS = {

  GYM: {
    name:          "GYM",
    primaryColor:  [0.06, 0.07, 0.12],   // dark navy
    secondaryColor:[0.80, 0.82, 0.85],   // silver trim
    roughness:     0.65,                 // synthetic compression fabric
    metalness:     0.0,
    sheen:         0.4,
    sheenColor:    [0.5, 0.55, 0.65],
    weaveType:     0,                    // 0 = smooth/compression
    coverage: {
      // regions covered by fabric: [yMin, yMax]
      torso:  [1.00, 1.65],   // tank top
      lower:  [0.62, 0.96],   // compression shorts
    },
    exposedRegions: ["arms", "legs", "head", "neck"],
  },

  CASUAL: {
    name:          "CASUAL",
    primaryColor:  [0.55, 0.55, 0.55],   // heather grey
    secondaryColor:[0.30, 0.30, 0.32],   // dark grey drawstring
    roughness:     0.88,                 // cotton fleece
    metalness:     0.0,
    sheen:         0.15,
    sheenColor:    [0.6, 0.6, 0.6],
    weaveType:     1,                    // 1 = knit/fleece
    coverage: {
      torso:  [0.90, 1.72],   // hoodie (covers neck)
      lower:  [0.14, 1.01],   // trousers meet the shirt instead of a bare waist gap
    },
    exposedRegions: ["hands", "head"],
  },

  FORMAL: {
    name:          "FORMAL",
    primaryColor:  [0.94, 0.94, 0.95],   // white dress shirt
    secondaryColor:[0.12, 0.12, 0.14],   // charcoal trousers
    roughness:     0.72,                 // poplin cotton
    metalness:     0.0,
    sheen:         0.25,
    sheenColor:    [0.9, 0.9, 0.9],
    weaveType:     2,                    // 2 = woven/poplin
    coverage: {
      torso:  [0.98, 1.70],
      lower:  [0.12, 1.04],
    },
    exposedRegions: ["hands", "head", "neck"],
  },

  SWIMWEAR: {
    name:          "SWIMWEAR",
    primaryColor:  [0.05, 0.35, 0.75],   // ocean blue
    secondaryColor:[1.00, 0.60, 0.10],   // orange stripe
    roughness:     0.55,                 // quick-dry nylon
    metalness:     0.0,
    sheen:         0.55,
    sheenColor:    [0.3, 0.6, 0.9],
    weaveType:     0,                    // smooth nylon
    coverage: {
      lower:  [0.68, 0.96],   // board shorts only
    },
    exposedRegions: ["torso", "arms", "legs", "head", "neck"],
  },

  UNDERWEAR: {
    name:          "UNDERWEAR",
    primaryColor:  [0.10, 0.10, 0.12],   // near-black
    secondaryColor:[0.25, 0.25, 0.30],   // grey waistband
    roughness:     0.70,
    metalness:     0.0,
    sheen:         0.3,
    sheenColor:    [0.4, 0.4, 0.45],
    weaveType:     1,                    // jersey knit
    coverage: {
      lower: [0.72, 0.97],
    },
    exposedRegions: ["torso", "arms", "legs", "head", "neck"],
  },

  // ANATOMICAL + BODY_COMP: no cloth shader (skin shader takes over)
  ANATOMICAL: null,
  BODY_COMP:  null,
};

// ─────────────────────────────────────────────────────────────────────────────
// VERTEX SHADER
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL FACTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a cloth ShaderMaterial for the given wardrobe preset.
 * Returns null for ANATOMICAL and BODY_COMP (skin shader handles those).
 *
 * @param {string} preset - key from WARDROBE_PRESETS
 * @returns {THREE.ShaderMaterial | null}
 */
export function createClothMaterial(preset = 'GYM', geometry = null, options = {}, asset = null) {
  const config = WARDROBE_CONFIGS[preset];
  if (!config) return null;
  // BufferGeometry.computeBoundingBox includes every morph extreme. Garment
  // bands use the neutral surface, otherwise trousers include the feet and the
  // waistband/neckline drift with the asset's unused morph envelope.
  const box = geometry?.attributes.position ? new THREE.Box3().setFromBufferAttribute(geometry.attributes.position) : null;
  const fabric=CLOTHING_FABRICS[options.fabric];
  const detail=(options.textureStrength ?? 65)/100;
  let topHem=-1,lowerHem=-1,waistMax=null;
  const authored=asset?.mesh?.geometry,authoredCoverage=authored?.getAttribute('_garment_coverage');
  if(authoredCoverage && box) {
    const landmarks=authoredGarmentLandmarks(authored),scale=1.92/(box.max.y-box.min.y),normalized=y=>(y-box.min.y)*scale;
    topHem=normalized(landmarks.topHem);lowerHem=normalized(landmarks.lowerHem);
    if(Number.isFinite(landmarks.waistMax))waistMax=normalized(landmarks.waistMax);
    if(!Number.isFinite(topHem))topHem=-1;
  }
  const material = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', roughness: fabric?.roughness ?? config.roughness,
    metalness: 0, sheen: fabric?.sheen ?? config.sheen, sheenRoughness: .85, clearcoat: 0, envMapIntensity: .6,
    map:options.pattern==='source'?asset?.map || null:null,normalMap:['CASUAL','FORMAL'].includes(preset)?asset?.normal || null:null,normalScale:new THREE.Vector2(detail,detail),
    side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const lowerBand = [...(preset === 'UNDERWEAR' ? ({briefs:[.83,.97],trunks:[.76,.97],boxerBriefs:[.70,.97]}[options.variant] || config.coverage.lower)
    : preset === 'GYM' ? options.variant === 'compression' ? [.57,.99] : [.62,.99] : preset==='SWIMWEAR' && options.variant==='short'?[.76,.96]:config.coverage.lower)];
  // The shell's legacy bands cut authored pants across the seat. Preserve the
  // complete native waist opening; rise remains a separate geometry adjustment.
  if(waistMax!==null)lowerBand[1]=waistMax;
  lowerBand[0]=lowerBand[1]-(lowerBand[1]-lowerBand[0])*(options.hemLength || 100)/100;
  const length=(options.hemLength || 100)/100;
  const physicalHem=lowerBand[0]-(length-1)*1.92*.14*Math.max(0,Math.min(1,(.95-lowerBand[0])/.8));
  const maskWaist=lowerBand[1];
  const physicalWaist=maskWaist+(options.waistRiseCm || 0)*1.92/175*Math.max(0,Math.min(1,(maskWaist-.72)/.25));
  const tank = preset === 'GYM' && (!options.variant || options.variant === 'tank');
  const sleeves = preset === 'CASUAL' ? options.variant === 'tee' ? 1 : 2 : preset === 'FORMAL' ? 2 : preset === 'GYM' && !tank ? 1 : 0;
  const uniforms = {
    uClothMin: { value: box?.min.y ?? -.81676 },
    uClothScale: { value: 1.92 / Math.max(.1, box ? box.max.y-box.min.y : 1.66589) },
    uTorsoBand: { value: new THREE.Vector2(...(config.coverage.torso || [-1,-1])) },
    uLowerBand: { value: new THREE.Vector2(...(lowerBand || [-1,-1])) },
    uTorsoWidth: { value: preset === 'GYM' ? .245 : .53 },
    uTankStyle: { value: tank ? 1 : 0 },
    uSleeves:{value:sleeves},
    uBriefStyle:{value:preset==='UNDERWEAR' && options.variant==='briefs'?1:0},
    uTrimColor:{value:options.trimColor?new THREE.Color(options.trimColor):new THREE.Color(...config.secondaryColor)},
    uLowerColor: { value: options.bottomColor ? new THREE.Color(options.bottomColor) : new THREE.Color(...(preset === 'FORMAL' ? config.secondaryColor : config.primaryColor)) },
    uTopColor:{value:options.topColor?new THREE.Color(options.topColor):new THREE.Color(...config.primaryColor)},
    uWeave:{value:fabric?.weave ?? config.weaveType},uDetail:{value:detail},uPinstripe:{value:options.pattern==='pinstripe'?1:0},uTrimDetail:{value:options.pattern==='source'?0:1},
    uMaskTopHem:{value:topHem},
    uWaistRise:{value:(options.waistRiseCm || 0)*1.92/175},
    // Bone weights overlap the ankle and shin. Mask through those weights above
    // the authored cuff, while retaining the foot below it even at long hems.
    uBodyLowerBand:{value:new THREE.Vector2(Math.max(physicalHem,Number.isFinite(lowerHem)?lowerHem:-1),physicalWaist)},
  };
  material.userData={wardrobePreset:preset,options,uniforms};
  material.customProgramCacheKey = () => 'authored-cloth-v5-' + preset + (authoredCoverage?'-authored':'-shell');
  const coverageCode=`
        bool lowerRegion = vGarmentCoverage.x > .2;
        bool torsoRegion = vGarmentCoverage.y > .2 && vGarmentCoverage.z < .2 && vGarmentCoverage.w < .2;
        bool lowerCloth = lowerRegion && vClothPosition.y >= uLowerBand.x && vClothPosition.y <= uLowerBand.y;
        if(uBriefStyle > .5 && vClothPosition.y < .80 + abs(vClothPosition.x)*.38) lowerCloth=false;
        bool torsoBand = vClothPosition.y >= uTorsoBand.x && vClothPosition.y <= uTorsoBand.y;
        bool torsoCloth = torsoBand && torsoRegion;
        if (uTankStyle > 0.5) {
          bool tankBody = vClothPosition.y <= 1.43 && abs(vClothPosition.x) < uTorsoWidth;
          bool tankStraps = vClothPosition.y > 1.43 && abs(vClothPosition.x) > 0.155 && abs(vClothPosition.x) < 0.230;
          torsoCloth = torsoCloth && (tankBody || tankStraps);
        }
        bool sleeve = (uSleeves > .5 && vGarmentCoverage.z > .2) || (uSleeves > 1.5 && vGarmentCoverage.w > .2);
        torsoCloth = torsoCloth || sleeve;
        if (!lowerCloth && !torsoCloth) discard;
        bool visibleLower = lowerCloth && !torsoCloth;`;
  const compile=(shader,depth=false,bodyMask=false)=> {
    const waistHeight=authoredCoverage?'vGarmentWaistHeight':'uLowerBand.y';
    // Authored shirts already have neck and sleeve openings. Applying the
    // shell's bone-based cuts again punched holes through those real seams.
    const garmentCoverage=authoredCoverage && config.coverage.torso && !tank && !bodyMask
      ? coverageCode.replace('bool torsoCloth = torsoBand && torsoRegion;','bool torsoCloth = vGarmentCoverage.y > .2;')
      : coverageCode;
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vClothPosition;\nattribute vec4 garmentCoverage;\nattribute vec3 garmentCoordinates;\nvarying vec4 vGarmentCoverage;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGarmentCoverage=garmentCoverage;\nvClothPosition=garmentCoordinates;');
    if(authoredCoverage) {
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float garmentWaistHeight;\nvarying float vGarmentWaistHeight;').replace('#include <begin_vertex>','#include <begin_vertex>\nvGarmentWaistHeight=garmentWaistHeight;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vGarmentWaistHeight;');
    }
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vClothPosition;\nvarying vec4 vGarmentCoverage;\nuniform vec2 uTorsoBand;\nuniform vec2 uLowerBand;\nuniform float uTorsoWidth;\nuniform float uTankStyle;\nuniform float uSleeves;\nuniform float uBriefStyle;\nuniform vec3 uTrimColor;\nuniform vec3 uLowerColor;\nuniform vec3 uTopColor;\nuniform float uWeave;\nuniform float uDetail;\nuniform float uPinstripe;\nuniform float uTrimDetail;\nuniform float uMaskTopHem;');
    if(bodyMask) {
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform vec2 uBodyLowerBand;\nuniform float uWaistRise;');
      const interior=coverageCode.replace('if (!lowerCloth && !torsoCloth) discard;','').replaceAll('uLowerBand','uBodyLowerBand')+`
        bool lowerInterior=lowerCloth && vClothPosition.y>uBodyLowerBand.x+.006 && vClothPosition.y<min(uBodyLowerBand.y,${waistHeight}+uWaistRise)-.006;
        bool topInterior=torsoCloth && (sleeve || vClothPosition.y<1.52) && (sleeve || vClothPosition.y>max(uTorsoBand.x,uMaskTopHem)+.012);
        if(lowerInterior || topInterior) discard;`;
      shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>','#include <alphatest_fragment>\n'+interior);return;
    }
    if(depth) {shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>','#include <alphatest_fragment>\n'+garmentCoverage);return;}
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        ${garmentCoverage}
        diffuseColor.rgb *= visibleLower ? uLowerColor : uTopColor;
        float waistband = visibleLower ? 1.0-smoothstep(.018,.030,abs(vClothPosition.y-${waistHeight}+.022)) : 0.0;
        float hem = visibleLower ? 1.0-smoothstep(.008,.016,abs(vClothPosition.y-uLowerBand.x-.012)) : 0.0;
        float sideSeam = visibleLower ? smoothstep(.16,.21,abs(vClothPosition.x))*(1.0-smoothstep(.21,.23,abs(vClothPosition.x))) : 0.0;
        float topHem = torsoCloth && !sleeve ? 1.0-smoothstep(.006,.014,abs(vClothPosition.y-uTorsoBand.x-.014)) : 0.0;
        diffuseColor.rgb = mix(diffuseColor.rgb,uTrimColor,max(max(waistband,hem),max(topHem,sideSeam*.45))*uTrimDetail);
        float weave=sin(vClothPosition.y*650.0)*sin(vClothPosition.x*(uWeave>1.5?850.0:650.0));
        diffuseColor.rgb *= 1.0-uDetail*.025 + uDetail*.025*weave;
        float stripe=1.0-smoothstep(.025,.08,abs(fract(vClothPosition.x*65.0)-.5));
        diffuseColor.rgb=mix(diffuseColor.rgb,uTrimColor,stripe*uPinstripe*.55);`);
  };
  material.onBeforeCompile=shader=>compile(shader);
  const depthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});
  const distanceMaterial=new THREE.MeshDistanceMaterial({side:THREE.DoubleSide});
  for(const depth of [depthMaterial,distanceMaterial]) {depth.onBeforeCompile=shader=>compile(shader,true);depth.customProgramCacheKey=()=>material.customProgramCacheKey()+'-coverage';}
  material.userData.depthMaterial=depthMaterial;material.userData.distanceMaterial=distanceMaterial;
  // Game/avatar wardrobes omit the hidden body interior beneath clothing. This
  // avoids skin fragments breaking through lower-density sewing topology while
  // preserving exposed neck, hands, openings, and every source measurement.
  material.userData.maskBody=(skin,body)=> {
    prepareGarmentAttributes(body,body.geometry,{includeAnkles:true});
    if(authoredCoverage)prepareWaistContour(body.geometry,body.geometry,authored);
    const previous=skin.onBeforeCompile,previousKey=skin.customProgramCacheKey;
    const key=previousKey.call(skin);
    skin.onBeforeCompile=(shader,renderer)=>{previous.call(skin,shader,renderer);compile(shader,false,true);};
    skin.customProgramCacheKey=()=>key+'-wardrobe-interior-v2'+(authoredCoverage?'-contour':'-shell');skin.needsUpdate=true;
    return ()=>{skin.onBeforeCompile=previous;skin.customProgramCacheKey=previousKey;skin.needsUpdate=true;};
  };
  material.addEventListener('dispose',()=>{depthMaterial.dispose();distanceMaterial.dispose();});
  return material;
}

/**
 * Switches wardrobe preset on an existing material by updating uniforms.
 * More efficient than destroying and recreating the material.
 *
 * @param {THREE.ShaderMaterial} mat
 * @param {string} preset
 */
export function switchWardrobePreset(mat, preset) {
  const config = WARDROBE_CONFIGS[preset];
  if (!config || !mat) return;

  if(mat.userData?.uniforms?.uTopColor) {
    const next=createClothMaterial(preset,null,wardrobeDefaults(preset));
    for(const [key,uniform] of Object.entries(next.userData.uniforms)) {
      if(key==='uClothMin'||key==='uClothScale')continue;
      const current=mat.userData.uniforms[key];
      if(current?.value?.copy)current.value.copy(uniform.value);else if(current)current.value=uniform.value;
    }
    mat.color.set('#ffffff');mat.roughness=next.roughness;mat.sheen=next.sheen;
    mat.map=null;mat.normalMap=null;mat.userData.wardrobePreset=preset;mat.userData.options=wardrobeDefaults(preset);mat.needsUpdate=true;
    next.dispose();return;
  }

  // Cloth materials are rebuilt when the body geometry changes, but this
  // helper remains safe for callers that want to update an existing material.
  // MeshPhysicalMaterial keeps its visible colour on `color`; shader uniforms
  // are only available after `onBeforeCompile` has run.
  if (mat.color?.setRGB) mat.color.setRGB(...config.primaryColor);
  mat.userData = { ...mat.userData, wardrobePreset: preset, wardrobeConfig: config };
  if (!mat.uniforms) return;

  const bands = Object.values(config.coverage ?? {});
  const band1 = bands[0] ? new THREE.Vector2(bands[0][0], bands[0][1]) : new THREE.Vector2(-1, -1);
  const band2 = bands[1] ? new THREE.Vector2(bands[1][0], bands[1][1]) : new THREE.Vector2(-1, -1);

  mat.uniforms.uPrimaryColor?.value?.setRGB?.(...config.primaryColor);
  mat.uniforms.uSecondaryColor?.value?.setRGB?.(...config.secondaryColor);
  if (mat.uniforms.uRoughness) mat.uniforms.uRoughness.value = config.roughness;
  if (mat.uniforms.uSheen) mat.uniforms.uSheen.value = config.sheen;
  mat.uniforms.uSheenColor?.value?.setRGB?.(...config.sheenColor);
  if (mat.uniforms.uWeaveType) mat.uniforms.uWeaveType.value = config.weaveType;
  mat.uniforms.uCovBand1?.value?.copy?.(band1);
  mat.uniforms.uCovBand2?.value?.copy?.(band2);
  if (mat.uniforms.uStripeStrength) mat.uniforms.uStripeStrength.value = preset === "SWIMWEAR" ? 0.4 : 0.0;
}

/**
 * Returns whether a given wardrobe preset uses cloth (true)
 * or falls back to skin/anatomical shader (false).
 * @param {string} preset
 */
export function isClothPreset(preset) {
  return !!WARDROBE_CONFIGS[preset];
}

// ─────────────────────────────────────────────────────────────────────────────
// COVERAGE MAP HELPER
// Returns which body regions are exposed (skin shader) vs covered (cloth)
// Used by HumanoidClone to decide whether to render skin or cloth on each mesh.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the list of exposed region names for a given wardrobe preset.
 * @param {string} preset
 * @returns {string[]}
 */
export function getExposedRegions(preset) {
  return WARDROBE_CONFIGS[preset]?.exposedRegions ?? [];
}
