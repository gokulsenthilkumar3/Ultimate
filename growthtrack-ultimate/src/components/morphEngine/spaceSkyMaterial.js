import * as THREE from 'three';
import { SPACE_SKY_PRESETS, sanitizeSpaceSky, spaceSkyResolution } from '../../lib/spaceSky';

const vertexShader = `
varying vec3 vDirection;
void main() {
  vDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = `
uniform float uPreset;
uniform float uIntensity;
varying vec3 vDirection;
float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.17, 0.31, 0.73));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x),
                 mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                 mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
}
float cloud(vec3 p) {
  float value = 0.0, amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p = p * 2.03 + vec3(7.1, 3.4, 1.8);
    amplitude *= 0.5;
  }
  return value;
}
vec3 stars(vec3 d) {
  // Three planar projections avoid a polar singularity and longitude seam.
  vec3 a = abs(d);
  vec2 uv = a.x > a.y && a.x > a.z ? d.yz / a.x : a.y > a.z ? d.xz / a.y : d.xy / a.z;
  vec2 grid = uv * 145.0;
  vec2 cell = floor(grid);
  float seed = hash(vec3(cell, 21.0));
  vec2 center = vec2(hash(vec3(cell, 4.0)), hash(vec3(cell, 9.0))) * 0.6 + 0.2;
  float dist = length(fract(grid) - center);
  float radius = mix(0.025, 0.14, pow(seed, 18.0));
  float aa = max(fwidth(grid.x), fwidth(grid.y)) * 0.35;
  float footprint = radius * radius + aa * aa;
  // Conserve brightness as a subpixel star is filtered into a larger texel.
  // Without this factor lower tiers turn tiny stars into bright square blobs.
  float point = exp(-dist * dist / footprint) * radius * radius / footprint;
  float magnitude = step(0.94, seed) * (0.05 + pow(seed, 28.0) * 0.65);
  vec3 temperature = mix(vec3(0.6,0.75,1.0), vec3(1.0,0.8,0.6), hash(vec3(cell, 15.0)));
  return temperature * point * magnitude;
}
void main() {
  vec3 d = normalize(vDirection);
  vec3 color = mix(vec3(0.001,0.002,0.006), vec3(0.009,0.015,0.03), d.y * 0.5 + 0.5);
  vec3 star = stars(d);
  if (uPreset < 0.5) {
    float horizon = d.y + 0.34;
    float limb = exp(-abs(horizon) * 90.0);
    float planet = 1.0 - smoothstep(-0.04, 0.0, horizon);
    color = mix(color + star, vec3(0.006,0.025,0.07) * (0.4 + cloud(d*12.0)), planet);
    color += limb * vec3(0.06,0.3,0.65);
    color += vec3(0.7,0.55,0.3) * pow(max(0.0,dot(d,normalize(vec3(-0.8,0.2,0.6)))),512.0);
  } else if (uPreset < 1.5) {
    float gas = cloud(d * 3.2 + cloud(d * 5.0) * 2.0);
    float band = pow(max(0.0, 1.0 - abs(d.y + d.x * 0.3)), 3.0);
    color += mix(vec3(0.025,0.045,0.18), vec3(0.16,0.025,0.12), gas) * pow(gas,2.0) * band * 3.0 + star;
  } else if (uPreset < 2.5) {
    float galaxies = pow(cloud(d * 23.0), 14.0);
    color = vec3(0.001,0.002,0.004) + star * 0.8 + galaxies * vec3(0.25,0.2,0.35);
  } else if (uPreset < 3.5) {
    float angle = atan(d.z,d.x);
    float ridge = 0.32 + sin(angle * 3.0) * 0.12 + sin(angle * 7.0) * 0.04;
    float curtain = exp(-abs(d.y-ridge) * 15.0) * (0.35 + 0.65 * noise(d*vec3(48.0,3.0,48.0)));
    color += mix(vec3(0.015,0.22,0.09),vec3(0.14,0.025,0.22),smoothstep(ridge,ridge+0.18,d.y)) * curtain;
    color += star * smoothstep(-0.05,0.15,d.y);
    color *= smoothstep(-0.2,0.06,d.y) * 0.9 + 0.1;
  } else {
    color += star * 0.08;
  }
  gl_FragColor = vec4(color * uIntensity, 1.0);
}`;

export function createSpaceSkyMaterial(preset, intensity = 1) {
  return new THREE.ShaderMaterial({
    name: 'ProceduralSpaceSky', vertexShader, fragmentShader,
    uniforms: {
      uPreset: { value: SPACE_SKY_PRESETS.findIndex(item => item.id === sanitizeSpaceSky(preset)) },
      uIntensity: { value: intensity },
    },
    side: THREE.BackSide, depthWrite: false, toneMapped: false,
  });
}

export function bakeSpaceSky(renderer, preset, tier) {
  const target = new THREE.WebGLCubeRenderTarget(spaceSkyResolution(tier), {
    colorSpace: THREE.LinearSRGBColorSpace, generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter, depthBuffer: false,
  });
  target.texture.name = `SpaceSky:${sanitizeSpaceSky(preset)}`;
  const geometry = new THREE.BoxGeometry(2, 2, 2);
  const material = createSpaceSkyMaterial(preset);
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(geometry, material));
  const previous = { target: renderer.getRenderTarget(), face: renderer.getActiveCubeFace(), mip: renderer.getActiveMipmapLevel(), xr: renderer.xr.enabled, autoClear: renderer.autoClear };
  try {
    renderer.autoClear = true;
    new THREE.CubeCamera(0.1, 10, target).update(renderer, scene);
    return target;
  } catch (error) {
    target.dispose();
    throw error;
  } finally {
    renderer.setRenderTarget(previous.target, previous.face, previous.mip);
    renderer.xr.enabled = previous.xr;
    renderer.autoClear = previous.autoClear;
    geometry.dispose();
    material.dispose();
  }
}
