// Eyes for the preview head.
//
// The source model's eye mesh holds, per eye, an opaque eyeball (a sphere of about 12.7 mm radius, close to a real
// eye's 12 mm) and a transparent glass shell in front of it. Its photo texture is too dark and too grey to reuse, so
// this module only takes the geometry's *placement* (sphere fit, scale from the morphs) and draws its own:
//
//  - a clean high-resolution sphere with a procedural iris: radial fibres, a collarette ring, crypts, a dark limbal
//    ring and a round pupil, in any colour; a warm white sclera that reddens toward the corners and gets faint veins;
//  - a transparent cornea shell drawn as specular light only, so windows and lamps show as wet catchlights;
//  - a pivot per eye, so each eye can look at the viewer within a natural range.
import { AdditiveBlending, Color, Group, Mesh, MeshPhysicalMaterial, ShaderMaterial, SphereGeometry, Vector3 } from 'three';
import { NOISE } from './skin.mjs';
import { buildEyes } from './eyelayout.mjs';

export { buildEyes };

/** Human iris is about 11.7 mm across (range roughly 10-13); the eyeball radius is read from the model. */
export const IRIS_MM = 11.7;
export const PUPIL_MM = 3.8;

/** Named natural iris colours: [outer (periphery), inner (around the pupil)]. */
export const IRIS_COLORS = {
  'Dark brown': ['#3b2415', '#6b4423'],
  Brown: ['#5e3a1c', '#9a6428'],
  Hazel: ['#6f5a2a', '#b98a2f'],
  Amber: ['#a2661b', '#d39a35'],
  Green: ['#3f6a3d', '#9a9a3a'],
  Blue: ['#3d6e9c', '#8fb1c6'],
  Grey: ['#6c7b86', '#a7aea6'],
};

/** Follow the morphs: move each eye's pivot with its vertices and scale it with their spread. */
export function updateEyes(eyes, groups, worldPositions, base) {
  eyes.forEach((eye, e) => {
    const d = [0, 0, 0];
    for (const v of eye.front) for (let k = 0; k < 3; k += 1) d[k] += (worldPositions[v * 3 + k] - base[v * 3 + k]) / eye.front.length;
    const c = eye.center.map((v, k) => v + d[k]);
    let r = 0; for (const v of eye.front) r += Math.hypot(worldPositions[v * 3] - c[0], worldPositions[v * 3 + 1] - c[1], worldPositions[v * 3 + 2] - c[2]) / eye.front.length;
    const group = groups[e]; group.position.set(c[0], c[1], c[2]);
    group.userData.scale = r / eye.radius; group.scale.setScalar(group.userData.scale * (group.userData.sizeScale ?? 1));
  });
}

const PARS = /* glsl */`
uniform vec3 uIris; uniform vec3 uIrisInner; uniform vec3 uSclera; uniform float uIrisR; uniform float uPupil; uniform float uVein; uniform float uRough;
varying vec3 vDir; float gIris = 0.0;
${NOISE}`;

const MAP_FRAGMENT = /* glsl */`
{
  vec3 dir = normalize( vDir );
  float ang = acos( clamp( dir.z, -1.0, 1.0 ) );
  float phi = atan( dir.y, dir.x );
  vec2 pc = vec2( cos( phi ), sin( phi ) );
  float r = ang / uIrisR;                       // 0 at the pupil, 1 at the limbus
  float iris = 1.0 - smoothstep( 0.985, 1.02, r );
  gIris = iris;
  // Radial fibres: noise that changes quickly around the iris and slowly along a radius.
  float fib = vnoise( vec3( pc * 9.0, r * 2.2 ) ) * 0.5 + vnoise( vec3( pc * 22.0, r * 3.4 + 5.0 ) ) * 0.33 + vnoise( vec3( pc * 50.0, r * 5.0 + 11.0 ) ) * 0.17;
  float wob = ( vnoise( vec3( pc * 5.0, 1.7 ) ) - 0.5 ) * 0.09;
  float coll = 0.43 + wob;                      // the collarette, a ragged ring between the pupil and ciliary zones
  vec3 col = mix( uIrisInner, uIris, smoothstep( coll - 0.1, coll + 0.2, r ) );
  col *= 0.5 + 0.95 * fib;
  col = mix( col, uIrisInner * 1.3, exp( - pow( ( r - coll ) / 0.06, 2.0 ) ) * 0.5 );
  float crypt = smoothstep( 0.6, 0.76, vnoise( vec3( pc * 5.5, r * 3.0 + 9.0 ) ) ) * smoothstep( 0.35, 0.55, r ) * ( 1.0 - smoothstep( 0.78, 0.92, r ) );
  col *= 1.0 - 0.5 * crypt;
  col *= mix( 1.0, 0.22, smoothstep( 0.8, 1.0, r ) );   // limbal ring
  col *= mix( 0.55, 1.0, smoothstep( uPupil, uPupil + 0.14, r ) );
  col = mix( col, vec3( 0.005 ), 1.0 - smoothstep( uPupil - 0.03, uPupil + 0.02, r ) );
  // Sclera: warm white, shaded and a little red toward the corners and lids, with faint thin vessels.
  float lidShade = smoothstep( 0.3, 0.95, abs( dir.y ) ) * 0.5 + smoothstep( 0.55, 0.97, abs( dir.x ) ) * 0.4;
  vec3 scl = uSclera * ( 1.0 - 0.45 * lidShade );
  scl = mix( scl, scl * vec3( 1.0, 0.8, 0.76 ), smoothstep( 0.6, 0.97, abs( dir.x ) ) * 0.6 );
  float vn = vnoise( dir * vec3( 26.0, 26.0, 18.0 ) );
  float vessel = ( 1.0 - smoothstep( 0.0, 0.05, abs( vn - 0.5 ) ) ) * smoothstep( 0.62, 1.1, ang );
  scl = mix( scl, vec3( 0.72, 0.22, 0.2 ), vessel * uVein );
  scl = mix( scl, scl * vec3( 1.0, 0.72, 0.7 ), uVein * 0.35 * smoothstep( 0.5, 1.0, ang ) );
  diffuseColor.rgb = mix( scl, col, iris );
}`;

export function createEyeMaterial() {
  const uniforms = {
    uIris: { value: new Color(IRIS_COLORS.Brown[0]) }, uIrisInner: { value: new Color(IRIS_COLORS.Brown[1]) }, uSclera: { value: new Color('#efe8e1') },
    uIrisR: { value: Math.asin(IRIS_MM / 2 / 12.7) }, uPupil: { value: PUPIL_MM / IRIS_MM }, uVein: { value: 0.18 }, uRough: { value: 0.4 },
  };
  const material = new MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0, envMapIntensity: 0.6 });
  material.customProgramCacheKey = () => 'plan-eye-v2';
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDir;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDir = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${PARS}`)
      .replace('#include <map_fragment>', MAP_FRAGMENT)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix( uRough + 0.1, uRough - 0.08, gIris );');
  };
  return { material, uniforms };
}

/**
 * The cornea: draws only what a wet, curved surface reflects, added on top of the eye beneath. The lights a portrait
 * photographer sets up sit near the camera, so the catchlights are two soft windows placed relative to the view
 * (a strong one up and to one side of the pupil, a faint bounce opposite), not tied to the scene's lights.
 */
export function createCorneaMaterial() {
  return new ShaderMaterial({
    transparent: true, blending: AdditiveBlending, depthWrite: false, uniforms: { uStrength: { value: 1 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main() { vec4 mv = modelViewMatrix * vec4( position, 1.0 ); vN = normalize( normalMatrix * normal ); vV = normalize( -mv.xyz ); gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform float uStrength;
varying vec3 vN;
varying vec3 vV;
float windowAt( vec2 p, vec2 centre, vec2 size ) {
  vec2 d = abs( p - centre );
  return ( 1.0 - smoothstep( size.x * 0.55, size.x, d.x ) ) * ( 1.0 - smoothstep( size.y * 0.55, size.y, d.y ) );
}
void main() {
  vec3 N = normalize( vN ); vec3 V = normalize( vV );
  vec3 R = reflect( -V, N );
  if ( R.z < 0.05 ) discard;
  vec2 p = R.xy / R.z;
  float fres = 0.04 + 0.96 * pow( 1.0 - clamp( dot( N, V ), 0.0, 1.0 ), 5.0 );
  float h = windowAt( p, vec2( -0.2, 0.13 ), vec2( 0.075, 0.05 ) ) + 0.22 * windowAt( p, vec2( 0.17, -0.1 ), vec2( 0.11, 0.07 ) );
  float rim = fres * 0.55;                                  // grazing reflection of the room at the edge of the eye
  gl_FragColor = vec4( vec3( ( h * 0.95 + rim ) * uStrength ), 1.0 );
  #include <colorspace_fragment>
}`,
  });
}

const BALL = new SphereGeometry(1, 72, 54).rotateX(Math.PI / 2);   // pole on +z, the direction the eye looks

/** One pivot group per eye, each holding the eyeball and its cornea. Scale to the eye's own size. */
export function makeEyeMeshes(eyes, eyeMaterial, corneaMaterial) {
  return eyes.map(eye => {
    const group = new Group();
    const ball = new Mesh(BALL, eyeMaterial); ball.scale.setScalar(eye.radius); ball.frustumCulled = false; ball.castShadow = false; ball.receiveShadow = true;
    const cornea = new Mesh(BALL, corneaMaterial); cornea.scale.setScalar(eye.shellRadius); cornea.position.set(...eye.shellOffset);
    cornea.frustumCulled = false; cornea.renderOrder = 3;
    group.add(ball, cornea);
    return group;
  });
}

const FORWARD = new Vector3(0, 0, 1);
const aim = new Vector3(); const mid = new Vector3(); const gaze = new Vector3();
/**
 * Turn each eye toward a world-space point, within a natural range. A point closer than `near` metres is pushed out
 * to that distance, so a close-up camera does not make the eyes cross.
 */
export function aimEyes(groups, parent, targetWorld, { yaw = 0.38, pitch = 0.26, near = 1.0 } = {}) {
  aim.copy(targetWorld); parent.worldToLocal(aim);
  mid.set(0, 0, 0); for (const group of groups) mid.add(group.position); mid.multiplyScalar(1 / groups.length);
  gaze.copy(aim).sub(mid); const d = gaze.length(); if (d > 0 && d < near / parent.scale.x) aim.copy(mid).addScaledVector(gaze, near / parent.scale.x / d);
  for (const group of groups) {
    gaze.copy(aim).sub(group.position).normalize();
    const hx = Math.atan2(gaze.x, gaze.z); const hy = Math.asin(Math.max(-1, Math.min(1, gaze.y)));
    group.rotation.set(-Math.max(-pitch, Math.min(pitch, hy)), Math.max(-yaw, Math.min(yaw, hx)), 0, 'YXZ');
  }
  return FORWARD;
}
