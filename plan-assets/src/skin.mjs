// Skin material for the preview body: a physically based surface with the extra terms real skin needs.
//
//  - Scattering: light wraps past the terminator, widest for red and narrowest for blue, so shadow edges glow warm
//    instead of going grey (wrap lighting with a chromatic wrap, after GPU Gems 3 ch. 16 and Penner's pre-integrated skin).
//  - Thin skin (ears, nostril wings, nose tip) lets light through when backlit.
//  - Pores and fine relief: bump from procedural noise plus the painted albedo's own detail; faded by pixel footprint.
//  - Regional colour: blush, eye-socket shading, lips (colour, gloss, seam), T-zone shine, freckles.
//  - Tone: one continuous colour times the photo detail, then undertone, tan and local pigment as separate layers.
import { Color, MeshPhysicalMaterial, ShaderChunk, Vector3 } from 'three';

export const NOISE = /* glsl */`
float h13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vnoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h13(i), h13(i + vec3(1, 0, 0)), f.x), mix(h13(i + vec3(0, 1, 0)), h13(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h13(i + vec3(0, 0, 1)), h13(i + vec3(1, 0, 1)), f.x), mix(h13(i + vec3(0, 1, 1)), h13(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}`;

const PARS = /* glsl */`
uniform vec3 uSkin; uniform vec3 uMean; uniform vec3 uPig; uniform vec3 uBrief; uniform float uTan; uniform vec3 uTanMul;
uniform vec3 uHiCol; uniform float uHi; uniform vec3 uHairCol; uniform vec3 uLip; uniform float uBlush; uniform float uFreckle;
uniform vec3 uUnder; uniform float uOily; uniform float uPore; uniform float uScatter; uniform float uTrans; uniform float uLipGloss; uniform float uScalp;
varying float vBrief; varying float vTan; varying float vPig; varying float vHi; varying float vHair;
varying vec4 vFaceA; varying vec4 vFaceB; varying vec3 vBase;
float gLuma = 0.5; float gLip = 0.0;
${NOISE}
vec3 skinWrap(float ndl) {
  vec3 w = vec3(0.62, 0.34, 0.16) * uScatter;
  vec3 d = clamp((vec3(ndl) + w) / (1.0 + w), 0.0, 1.0);
  return d * mix(vec3(1.0), vec3(0.92), uScatter);
}
float poreHeight(vec3 p, float footprint) {
  float fine = vnoise(p * 2.7);                       // ~0.4 mm cells: pores
  float mid = vnoise(p * 0.95 + 7.3);                  // ~1 mm: micro-relief
  float broad = vnoise(p * 0.3 + 3.1);                 // ~3 mm: soft unevenness
  float pores = smoothstep(0.55, 0.8, fine) * (1.0 - smoothstep(0.1, 0.35, footprint));
  float midFade = 1.0 - smoothstep(0.25, 0.9, footprint);
  return -pores * 0.7 + (mid - 0.5) * 0.45 * midFade + (broad - 0.5) * 0.3;
}
vec3 perturbSkin(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection) {
  vec3 vSigmaX = normalize(dFdx(surf_pos)); vec3 vSigmaY = normalize(dFdy(surf_pos));
  vec3 R1 = cross(vSigmaY, surf_norm); vec3 R2 = cross(surf_norm, vSigmaX);
  float fDet = dot(vSigmaX, R1) * faceDirection;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  return normalize(abs(fDet) * surf_norm - vGrad);
}`;

const MAP_FRAGMENT = /* glsl */`
vec3 texel = texture2D( map, vMapUv ).rgb;
gLuma = dot( texel, vec3( 0.2126, 0.7152, 0.0722 ) );
vec3 rel = clamp( texel / uMean, 0.0, 3.0 );
float relLuma = dot( rel, vec3( 0.2126, 0.7152, 0.0722 ) );
rel = mix( vec3( relLuma ), rel, 0.5 );
vec3 skinCol = mix( uSkin, uPig, smoothstep( 0.3, 0.7, vPig ) ) * rel * uUnder;
// Painted lips: geometry mask times the albedo's own red.
float chroma = ( texel.r - texel.g ) / ( texel.r + texel.g + texel.b + 1e-3 );
float lipMask = vFaceA.x * smoothstep( 0.36, 0.56, chroma );
gLip = lipMask;
vec3 lipCol = uLip * ( 0.55 + 0.6 * relLuma );
skinCol = mix( skinCol, lipCol, lipMask );
// Blood colour in cheeks, nose and ears; shadowed eye sockets; lip seam.
skinCol *= mix( vec3( 1.0 ), vec3( 1.07, 0.86, 0.84 ), vFaceA.y * uBlush );
skinCol *= mix( vec3( 1.0 ), vec3( 0.83, 0.77, 0.82 ), vFaceA.z * 0.8 );
skinCol *= mix( 1.0, 0.5, vFaceB.z );
// Freckles.
if ( uFreckle > 0.001 ) {
  vec3 fp = vBase * 1000.0;
  float spots = smoothstep( 0.74, 0.86, vnoise( fp * 0.55 ) ) * smoothstep( 0.35, 0.65, vnoise( fp * 0.11 + 4.0 ) );
  skinCol *= mix( vec3( 1.0 ), vec3( 0.78, 0.6, 0.5 ), spots * uFreckle * clamp( vFaceB.y + 0.25, 0.0, 1.0 ) );
}
skinCol = mix( skinCol, skinCol * uTanMul, clamp( vTan * uTan, 0.0, 1.0 ) );
float brief = smoothstep( 0.46, 0.54, vBrief );
skinCol = mix( skinCol, uBrief * ( 0.82 + 0.18 * relLuma ), brief );
skinCol = mix( skinCol, uHairCol * ( 0.7 + 0.3 * relLuma ), smoothstep( 0.2, 0.8, vHair ) * uScalp );
skinCol *= mix( 1.0, 0.62, uHi * ( 1.0 - vHi ) );
skinCol = mix( skinCol, uHiCol, vHi * uHi * 0.22 );
diffuseColor.rgb = skinCol;`;

const ROUGHNESS = /* glsl */`
float roughnessFactor = roughness;
roughnessFactor = mix( roughnessFactor, 0.9, smoothstep( 0.46, 0.54, vBrief ) );
roughnessFactor -= vFaceB.x * uOily * 0.2;
roughnessFactor += ( vnoise( vBase * 1000.0 * 0.5 ) - 0.5 ) * 0.1;
roughnessFactor = mix( roughnessFactor, 0.3, lipMask * uLipGloss );
roughnessFactor = clamp( roughnessFactor, 0.12, 1.0 );`;

const NORMAL_EXTRA = /* glsl */`
{
  vec3 bp = vBase * 1000.0;
  float fp = length( fwidth( bp ) );
  float h = poreHeight( bp, fp ) * uPore;
  // Fine relief that is already painted into the albedo (pores, stubble, folds).
  float hl = ( gLuma - 0.5 ) * 6.0 * ( 1.0 - smoothstep( 0.3, 1.2, fp ) );
  vec2 dH = vec2( dFdx( h ) + dFdx( hl ), dFdy( h ) + dFdy( hl ) ) * 0.55;
  normal = perturbSkin( - vViewPosition, normal, dH, faceDirection );
}`;

export function createSkinMaterial({ map, mean }) {
  const uniforms = {
    uSkin: { value: new Color('#bc8970') }, uMean: { value: new Vector3(...mean) }, uPig: { value: new Color('#996951') },
    uBrief: { value: new Color('#2f3b4a') }, uTan: { value: 0 }, uTanMul: { value: new Vector3(0.78, 0.6, 0.46) },
    uHiCol: { value: new Color('#0fb5a0') }, uHi: { value: 0 }, uHairCol: { value: new Color('#2b2018') },
    uLip: { value: new Color('#b0605a') }, uBlush: { value: 0.7 }, uFreckle: { value: 0 }, uUnder: { value: new Vector3(1, 1, 1) },
    uOily: { value: 0.5 }, uPore: { value: 1 }, uScatter: { value: 1 }, uTrans: { value: 0.7 }, uLipGloss: { value: 0.7 }, uScalp: { value: 0.8 },
  };
  const material = new MeshPhysicalMaterial({ map, roughness: 0.56, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.34, envMapIntensity: 0.7 });
  material.customProgramCacheKey = () => 'plan-skin-v2';
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute float aBrief; attribute float aTan; attribute float aPig; attribute float aHi; attribute float aHair;
attribute vec4 aFaceA; attribute vec4 aFaceB; attribute vec3 aBase;
varying float vBrief; varying float vTan; varying float vPig; varying float vHi; varying float vHair;
varying vec4 vFaceA; varying vec4 vFaceB; varying vec3 vBase;`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBrief = aBrief; vTan = aTan; vPig = aPig; vHi = aHi; vHair = aHair; vFaceA = aFaceA; vFaceB = aFaceB; vBase = aBase;');
    const lights = ShaderChunk.lights_physical_pars_fragment.replace(
      'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );',
      `float rawNL = dot( geometryNormal, directLight.direction );
	reflectedLight.directDiffuse += skinWrap( rawNL ) * directLight.color * BRDF_Lambert( material.diffuseContribution );
	float backlit = pow( saturate( dot( geometryViewDir, - directLight.direction ) * 0.5 + 0.5 ), 3.0 );
	reflectedLight.directDiffuse += directLight.color * vFaceA.w * backlit * uTrans * vec3( 1.0, 0.38, 0.22 ) * BRDF_Lambert( material.diffuseContribution );`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${PARS}`)
      .replace('#include <lights_physical_pars_fragment>', lights)
      .replace('#include <map_fragment>', MAP_FRAGMENT)
      .replace('#include <roughnessmap_fragment>', ROUGHNESS)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${NORMAL_EXTRA}`)
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\nmaterial.clearcoat = clamp( clearcoat * ( 1.0 + 2.2 * gLip * uLipGloss ), 0.0, 1.0 );\nmaterial.clearcoatRoughness = mix( clearcoatRoughness, 0.28, gLip );\n#endif');
  };
  return { material, uniforms };
}
