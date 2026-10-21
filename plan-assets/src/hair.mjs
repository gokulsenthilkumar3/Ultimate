// Drawing the strand hair (see hairgrow.mjs for how it is grown): camera-facing ribbons, Kajiya-Kay shading.
//
// Shading: Kajiya-Kay diffuse and two shifted specular lobes (a white surface highlight and a tinted one inside the
// fibre), darker toward the roots and deeper in the hair mass, shadowed by the head on the unlit side.
import { BufferAttribute, BufferGeometry, Color, DynamicDrawUsage, Mesh, ShaderMaterial, Vector3 } from 'three';
import { NOISE } from './skin.mjs';
import { strandPositions } from './hairgrow.mjs';

export * from './hairgrow.mjs';

/** A figure's own mesh for a strand set (static attributes are shared; positions are per figure). */
export function makeStrandMesh(strands, material) {
  const P = strands.P; const N = strands.count;
  if (!strands.shared) {
    const att = (array, size) => { const a = new BufferAttribute(array, size, true); return a; };
    strands.shared = { aTan: att(strands.tan, 3), aNrm: att(strands.nrm, 3), aMisc: att(strands.misc, 4), aRand: att(strands.rand, 4), index: new BufferAttribute(strands.index, 1) };
  }
  const geometry = new BufferGeometry();
  const position = new BufferAttribute(new Float32Array(N * P * 6), 3); position.setUsage(DynamicDrawUsage);
  geometry.setAttribute('position', position);
  for (const [name, a] of Object.entries(strands.shared)) { if (name === 'index') geometry.setIndex(a); else geometry.setAttribute(name, a); }
  const mesh = new Mesh(geometry, material); mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false;
  mesh.userData = { strands, position };
  return mesh;
}

/** Move the strands with the skin: each guide's root is bound to a skin triangle; the whole clump translates with it. */
export function updateStrandMesh(mesh, idx, bodyPos) {
  strandPositions(mesh.userData.strands, idx, bodyPos, mesh.userData.position.array);
  mesh.userData.position.needsUpdate = true;
}

// ---- material ---------------------------------------------------------------------------------------------
const VERT = /* glsl */`
attribute vec3 aTan; attribute vec3 aNrm; attribute vec4 aMisc; attribute vec4 aRand;
uniform float uWidth; uniform float uPx;
varying vec3 vT; varying vec3 vN; varying vec3 vV; varying vec4 vRand; varying float vS; varying float vCov; varying float vNy; varying float vSide;
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  float sc = length( modelViewMatrix[ 0 ].xyz );
  vec3 T = normalize( mat3( modelViewMatrix ) * aTan );
  vec3 V = normalize( -mv.xyz );
  vec3 side = normalize( cross( T, V ) );
  float t = aMisc.y; float sd = aMisc.x * 2.0 - 1.0;
  float w0 = uWidth * sc * mix( 1.0, 0.3, t * t ) * ( 0.75 + 0.5 * aRand.w );
  float w = max( w0, -mv.z * uPx * 1.2 );
  vCov = clamp( w0 / w, 0.4, 1.0 );
  mv.xyz += side * sd * w * 0.5;
  vT = T; vN = normalize( normalMatrix * aNrm ); vV = V; vRand = aRand; vS = t; vSide = sd;
  vNy = normalize( mat3( modelMatrix ) * aNrm ).y;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */`
uniform vec3 uColor; uniform vec3 uTip; uniform vec3 uGreyColor; uniform float uGrey; uniform float uShine; uniform float uSpec; uniform float uAO;
uniform vec3 uLd[3]; uniform vec3 uLc[3]; uniform vec3 uSky; uniform vec3 uGround; uniform float uTone;
varying vec3 vT; varying vec3 vN; varying vec3 vV; varying vec4 vRand; varying float vS; varying float vCov; varying float vNy; varying float vSide;
${NOISE}
vec3 lobe( vec3 L, vec3 Lc, vec3 T, vec3 N, vec3 V, vec3 albedo, float shift ) {
  float tl = dot( T, L );
  float kk = sqrt( max( 0.0, 1.0 - tl * tl ) );
  float nl = dot( N, L );
  float lit = smoothstep( -0.28, 0.5, nl );
  vec3 H = normalize( L + V );
  float e1 = mix( 40.0, 260.0, uShine ); float e2 = mix( 12.0, 60.0, uShine );
  vec3 T1 = normalize( T + N * ( -0.06 + shift ) ); vec3 T2 = normalize( T + N * ( 0.14 + shift ) );
  float d1 = dot( T1, H ); float d2 = dot( T2, H );
  float s1 = pow( sqrt( max( 0.0, 1.0 - d1 * d1 ) ), e1 );
  float s2 = pow( sqrt( max( 0.0, 1.0 - d2 * d2 ) ), e2 );
  float sparkle = 0.55 + 0.9 * vnoise( vec3( vS * 18.0, vRand.x * 40.0, vRand.w * 40.0 ) );
  vec3 diffuse = albedo * mix( kk, 0.5 * kk + 0.5 * max( nl, 0.0 ), 0.25 );
  vec3 spec = vec3( 1.0 ) * s1 * 0.11 + albedo * 1.6 * s2 * sparkle * 0.2;
  float back = pow( max( dot( -L, V ), 0.0 ), 5.0 ) * 0.35;
  return Lc * lit * ( diffuse + uSpec * spec * smoothstep( -0.1, 0.35, nl ) + albedo * back );
}
void main() {
  vec3 T = normalize( vT ); vec3 N = normalize( vN ); vec3 V = normalize( vV );
  vec3 albedo = uColor * ( 0.8 + 0.4 * vRand.x );
  albedo = mix( albedo, uTip, smoothstep( 0.5, 1.0, vS ) * 0.65 );
  albedo *= mix( 0.5, 1.0, smoothstep( 0.0, 0.3, vS ) );
  if ( vRand.y < uGrey ) albedo = uGreyColor * ( 0.8 + 0.35 * vRand.x );
  float ao = mix( 0.3, 1.0, smoothstep( 0.0, 0.8, vS ) ) * mix( 1.0 - uAO, 1.0, vRand.z );
  vec3 col = albedo * ao * mix( uGround, uSky, vNy * 0.5 + 0.5 );
  float shift = ( vnoise( vec3( vS * 6.0, vRand.w * 30.0, 2.0 ) ) - 0.5 ) * 0.2;
  for ( int i = 0; i < 3; i ++ ) col += lobe( uLd[ i ], uLc[ i ], T, N, V, albedo * ao, shift );
  // Sub-pixel strands: thin ribbons are widened to a pixel and kept with probability equal to their coverage (screen-door).
  float h = fract( sin( dot( gl_FragCoord.xy + vRand.xy * 53.0, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
  if ( vCov < h ) discard;
  gl_FragColor = vec4( col * uTone, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createHairMaterial({ color = '#4f3523', width = 0.00008, shine = 0.6, spec = 1, ao = 0.38 } = {}) {
  const uniforms = {
    uWidth: { value: width }, uPx: { value: 0.0007 }, uColor: { value: new Color(color) }, uTip: { value: new Color(color).multiplyScalar(1.35) },
    uGreyColor: { value: new Color('#b8b3ab') }, uGrey: { value: 0 }, uShine: { value: shine }, uSpec: { value: spec }, uAO: { value: ao },
    uLd: { value: [new Vector3(), new Vector3(), new Vector3()] }, uLc: { value: [new Color(), new Color(), new Color()] },
    uSky: { value: new Color('#ffffff') }, uGround: { value: new Color('#7a7a7a') }, uTone: { value: 1 },
  };
  const material = new ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, });
  return { material, uniforms };
}
