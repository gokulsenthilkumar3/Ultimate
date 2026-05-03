/**
 * GrowthTrack Ultimate — Layer 4: VFX / Shaders
 * AuraShader.js
 *
 * Cyan-white volumetric aura for the "YOUR GOAL" clone.
 *
 * Visual spec from architecture doc:
 *   Cyan-white rim aura on goal clone
 *   God-ray vertical light shafts rising from the model
 *   Pulsing breathing rhythm (not heartbeat — slower, aspirational)
 *   Strongest along the silhouette (fresnel-based)
 *   Fades to zero below the floor (no underground aura)
 *
 * Implementation: 3 layered effects
 *
 *   LAYER A — Rim/Fresnel glow (BackSide inflated mesh, already in HumanoidClone.jsx)
 *     AuraMesh uses this shader instead of MeshBasicMaterial.
 *
 *   LAYER B — Vertical god-ray particles (instanced planes, rises from Y=0)
 *     10–20 vertical quads around the model perimeter, animated upward.
 *     Each fades out at top (alpha 0), opaque at bottom.
 *
 *   LAYER C — Ground corona (flat disc on floor, fades outward)
 *     Rendered at Y=0.01, radius ~0.6, additive blend.
 *
 * All three effects share the same uTime and uIntensity uniforms.
 * uIntensity is driven by ambitionPath.currentMonthIndex / targetMonthIndex.
 */

import * as THREE from "three";

// ─────────────────────────────────────────────────────────────────────────────
// LAYER A — RIM AURA (replaces BackSide AuraMesh material)
// ─────────────────────────────────────────────────────────────────────────────

const rimAuraVertexShader = /* glsl */ `
  #include <morphtarget_pars_vertex>
  #include <skinning_pars_vertex>

  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying float vNoise;

  uniform float uTime;
  uniform float uInflate;  // how much to push verts along normal

  // Fast value noise for surface ripple
  float noise3(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
  }

  void main() {
    vNoise = noise3(position + vec3(uTime * 0.3));

    #include <morphtarget_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <defaultnormal_vertex>
    #include <morphnormal_vertex>
    #include <skinning_vertex>

    // Inflate along normal + add noise ripple
    vec3 inflated = transformed + objectNormal * (uInflate + vNoise * 0.008);

    #include <project_vertex>
    vWorldPosition = (modelMatrix * vec4(inflated, 1.0)).xyz;
    vWorldNormal   = normalize(mat3(modelMatrix) * objectNormal);
  }
`;

const rimAuraFragmentShader = /* glsl */ `
  precision highp float;

  varying vec3  vWorldNormal;
  varying vec3  vWorldPosition;
  varying float vNoise;

  uniform float uTime;
  uniform float uIntensity;  // 0–1 from ambition path progress

  const vec3 CYAN_CORE  = vec3(0.13, 0.83, 0.93);
  const vec3 WHITE_TIP  = vec3(0.85, 0.97, 1.00);

  void main() {
    vec3  N       = normalize(vWorldNormal);
    vec3  V       = normalize(cameraPosition - vWorldPosition);

    // Fresnel — strongest at silhouette
    float fresnel = pow(1.0 - max(0.0, dot(N, V)), 2.5);

    // Breathing pulse: ~0.25Hz (4s cycle, slow aspirational rhythm)
    float breath  = 0.75 + 0.25 * sin(uTime * 1.57);

    // Height fade: fade out below floor
    float heightFade = smoothstep(0.0, 0.15, vWorldPosition.y);

    // Noise ripple on the rim surface
    float ripple  = 0.85 + 0.15 * vNoise;

    float alpha   = fresnel * breath * heightFade * ripple * uIntensity;
    vec3  color   = mix(CYAN_CORE, WHITE_TIP, fresnel * 0.6);

    gl_FragColor  = vec4(color, clamp(alpha, 0.0, 0.75));
  }
`;

/**
 * Creates the rim aura material (replaces AuraMesh's MeshBasicMaterial).
 * @returns {THREE.ShaderMaterial}
 */
export function createRimAuraMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader:   rimAuraVertexShader,
    fragmentShader: rimAuraFragmentShader,
    uniforms: {
      uTime:      { value: 0.0 },
      uIntensity: { value: 1.0 },
      uInflate:   { value: 0.022 },
    },
    skinning:     true,
    morphTargets: true,
    morphNormals: true,
    transparent:  true,
    depthWrite:   false,
    blending:     THREE.AdditiveBlending,
    side:         THREE.BackSide,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER B — GOD-RAY SHAFTS (instanced vertical planes)
// ─────────────────────────────────────────────────────────────────────────────

const godRayVertexShader = /* glsl */ `
  attribute vec3  instancePosition;  // per-instance: x, z position + phase offset as y
  attribute float instancePhase;     // per-instance animation phase offset

  varying float vAlpha;
  varying vec2  vUv;

  uniform float uTime;
  uniform float uIntensity;

  void main() {
    vUv = uv;

    // Each shaft drifts slightly upward over time, wraps at top
    float drift   = mod(uTime * 0.18 + instancePhase, 1.0);

    // Billboard: keep facing camera (simple: just use world Y-aligned plane)
    vec3 worldPos = instancePosition;
    worldPos.y   += drift * 2.8;  // rises 2.8 world units before wrapping

    // Offset vertex by position
    vec3 pos      = position + worldPos;

    // Fade alpha: transparent at top (UV.y=1), opaque at bottom (UV.y=0)
    // Also fade in/out by drift position
    float topFade   = 1.0 - uv.y;
    float driftFade = sin(drift * 3.14159);
    vAlpha          = topFade * driftFade * uIntensity;

    gl_Position     = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const godRayFragmentShader = /* glsl */ `
  precision highp float;
  varying float vAlpha;
  varying vec2  vUv;

  uniform float uTime;

  const vec3 RAY_COLOR = vec3(0.13, 0.83, 0.93);

  void main() {
    // Horizontal fade: edges transparent, centre opaque
    float hEdge  = sin(vUv.x * 3.14159);

    // Flicker noise
    float flicker = 0.9 + 0.1 * fract(sin(uTime * 7.3 + vUv.y * 11.0) * 43758.5);

    float alpha   = vAlpha * hEdge * flicker;
    gl_FragColor  = vec4(RAY_COLOR, clamp(alpha, 0.0, 0.35));
  }
`;

const GOD_RAY_COUNT = 16; // number of shaft instances around perimeter

/**
 * Creates the instanced god-ray mesh.
 * Mount this as a sibling of the goal clone group.
 * @returns {THREE.Mesh}
 */
export function createGodRayMesh() {
  // Thin vertical plane geometry (width=0.04, height=2.8)
  const geo = new THREE.PlaneGeometry(0.04, 2.8, 1, 8);
  geo.translate(0, 1.4, 0); // pivot at bottom

  // Instance positions: spread around a circle of radius ~0.45
  const positions = new Float32Array(GOD_RAY_COUNT * 3);
  const phases    = new Float32Array(GOD_RAY_COUNT);
  const r         = 0.45;

  for (let i = 0; i < GOD_RAY_COUNT; i++) {
    const angle    = (i / GOD_RAY_COUNT) * Math.PI * 2;
    positions[i * 3]     = Math.cos(angle) * r;
    positions[i * 3 + 1] = 0;                       // Y is instance base
    positions[i * 3 + 2] = Math.sin(angle) * r;
    phases[i]            = i / GOD_RAY_COUNT;        // stagger phase
  }

  geo.setAttribute("instancePosition", new THREE.InstancedBufferAttribute(positions, 3));
  geo.setAttribute("instancePhase",    new THREE.InstancedBufferAttribute(phases,    1));

  const mat = new THREE.ShaderMaterial({
    vertexShader:   godRayVertexShader,
    fragmentShader: godRayFragmentShader,
    uniforms: {
      uTime:      { value: 0.0 },
      uIntensity: { value: 1.0 },
    },
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
    side:        THREE.DoubleSide,
  });

  const mesh            = new THREE.Mesh(geo, mat);
  mesh.frustumCulled    = false;
  mesh.renderOrder      = 5;
  mesh.name             = "god-rays";
  return mesh;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER C — GROUND CORONA (flat glow disc on floor)
// ─────────────────────────────────────────────────────────────────────────────

const groundCoronaFragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uIntensity;

  const vec3 CORONA_COLOR = vec3(0.05, 0.65, 0.85);

  void main() {
    // Radial gradient: centre bright, edge transparent
    vec2  center = vUv - 0.5;
    float r      = length(center) * 2.0;  // 0=center, 1=edge
    float fade   = 1.0 - smoothstep(0.4, 1.0, r);

    // Slow pulse
    float pulse  = 0.7 + 0.3 * sin(uTime * 1.2);

    // Rotating shimmer
    float angle  = atan(center.y, center.x);
    float shimmer = 0.85 + 0.15 * sin(angle * 6.0 + uTime * 2.0);

    float alpha  = fade * pulse * shimmer * uIntensity * 0.5;
    gl_FragColor = vec4(CORONA_COLOR, clamp(alpha, 0.0, 0.5));
  }
`;

/**
 * Creates the ground corona disc mesh.
 * Position at [0, 0.01, 0] (just above floor).
 * @returns {THREE.Mesh}
 */
export function createGroundCorona() {
  const geo = new THREE.PlaneGeometry(1.2, 1.2);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: groundCoronaFragmentShader,
    uniforms: {
      uTime:      { value: 0.0 },
      uIntensity: { value: 1.0 },
    },
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
    side:        THREE.FrontSide,
  });

  const mesh         = new THREE.Mesh(geo, mat);
  mesh.position.y    = 0.01;
  mesh.renderOrder   = 4;
  mesh.name          = "ground-corona";
  return mesh;
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIFIED UPDATER — call once per frame for all aura layers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Updates all aura uniforms per frame.
 * @param {{
 *   rimMat:    THREE.ShaderMaterial,
 *   godRays:   THREE.Mesh,
 *   corona:    THREE.Mesh,
 * }} refs
 * @param {{ time: number, intensity: number }} params
 */
export function updateAuraUniforms(refs, { time = 0, intensity = 1 } = {}) {
  const { rimMat, godRays, corona } = refs;

  if (rimMat?.uniforms) {
    rimMat.uniforms.uTime.value      = time;
    rimMat.uniforms.uIntensity.value = intensity;
  }
  if (godRays?.material?.uniforms) {
    godRays.material.uniforms.uTime.value      = time;
    godRays.material.uniforms.uIntensity.value = intensity;
  }
  if (corona?.material?.uniforms) {
    corona.material.uniforms.uTime.value      = time;
    corona.material.uniforms.uIntensity.value = intensity;
  }
}
