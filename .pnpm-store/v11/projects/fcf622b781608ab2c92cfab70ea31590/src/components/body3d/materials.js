import * as THREE from "three";

// ── PEEL SHADER (Zygote Anatomical Transition) ──
const peelShader = {
  uniforms: {
    uDepth:     { value: 1.0 },
    uColor:     { value: new THREE.Color(0xeab308) },
    uEmissive:  { value: new THREE.Color(0x3d3000) },
    uIntensity: { value: 0.35 },
    uIsOrgan:   { value: 0.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vPosition = mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float uDepth;
    uniform vec3 uColor;
    uniform vec3 uEmissive;
    uniform float uIntensity;
    uniform float uIsOrgan;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vec3 lightDir = normalize(vec3(1.0, 2.0, 3.0));
      float diff = max(dot(vNormal, lightDir), 0.2);
      vec3 finalColor = uColor * diff + (uEmissive * uIntensity);

      float alpha = 1.0;

      if (uIsOrgan > 0.5) {
        alpha = smoothstep(0.7, 0.3, uDepth) * 0.9;
      } else {
        alpha = smoothstep(0.0, 0.5, uDepth);
      }

      if (alpha < 0.05) discard;
      gl_FragColor = vec4(finalColor, alpha);
    }
  `
};

function createPeelMaterial(colorHex, emissiveHex, intensity = 0.35, isOrgan = false) {
  const mat = new THREE.ShaderMaterial({
    uniforms:       THREE.UniformsUtils.clone(peelShader.uniforms),
    vertexShader:   peelShader.vertexShader,
    fragmentShader: peelShader.fragmentShader,
    transparent:    true,
    side:           THREE.DoubleSide
  });
  mat.uniforms.uColor.value.setHex(colorHex);
  mat.uniforms.uEmissive.value.setHex(emissiveHex);
  mat.uniforms.uIntensity.value = intensity;
  mat.uniforms.uIsOrgan.value   = isOrgan ? 1.0 : 0.0;
  return mat;
}

// ── ADVANCED SKIN MATERIAL ──
function createSkinMaterial(color) {
  return new THREE.MeshPhysicalMaterial({
    color:               new THREE.Color(color || '#C68642'),
    roughness:           0.72,
    metalness:           0.0,
    thickness:           0.8,
    attenuationColor:    new THREE.Color('#ff9966'),
    attenuationDistance: 0.3,
    clearcoat:           0.05,
    clearcoatRoughness:  0.9,
    sheen:               0.15,
    sheenColor:          new THREE.Color('#ffddcc'),
    envMapIntensity:     0.8,
    transparent:         true,
    opacity:             1.0,
    side:                THREE.FrontSide,
  });
}

// ── VASCULARITY SHADER INJECTION ──
function injectVascularity(material, vascularityLevel) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uVascularity = { value: vascularityLevel };
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       varying vec2 vUv;
       uniform float uVascularity;
       float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
       float noise(vec2 p) {
         vec2 i = floor(p); vec2 f = fract(p);
         float a = hash(i); float b = hash(i + vec2(1.0, 0.0));
         float c = hash(i + vec2(0.0, 1.0)); float d = hash(i + vec2(1.0, 1.0));
         vec2 u = f * f * (3.0 - 2.0 * f);
         return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
       }
      `
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
       float vein = noise(vUv * 50.0) * noise(vUv * 20.0);
       float veinMask = smoothstep(0.4, 0.6, vein) * uVascularity;
       diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.7, veinMask);
      `
    );
  };
}

export { createPeelMaterial, createSkinMaterial, injectVascularity };
