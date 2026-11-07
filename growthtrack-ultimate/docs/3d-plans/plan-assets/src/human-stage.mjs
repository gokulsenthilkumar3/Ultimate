// 3D stage for the v4 plan page: a real human body you can orbit, measured and
// fitted from the numbers a person enters. Bundled with three.js into
// plan-assets/human-stage.js (see growthtrack-ultimate/scripts/plan-preview/build-viewer.mjs).
import {
  NeutralToneMapping, BufferAttribute, BufferGeometry, CanvasTexture, CatmullRomCurve3, Color, ConeGeometry, CylinderGeometry,
  DirectionalLight, DoubleSide, DynamicDrawUsage, Group, HemisphereLight, LineDashedMaterial, LineLoop, LinearMipmapLinearFilter,
  Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, PMREMGenerator, ShaderMaterial,
  Raycaster, SphereGeometry, Spherical, SRGBColorSpace, Scene, Texture, TubeGeometry, Vector2, Vector3, WebGLRenderer, Line, PCFShadowMap,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { decodePreview } from './decode.mjs';
import { buildModel, fitEntries, measureAll, measureSite, SITES } from './fit.mjs';
import { applyMorphs, loopCentroid, loopLength, vertexNormals } from './geometry.mjs';
import { createSkinMaterial } from './skin.mjs';
import { faceMasks, LM } from './face.mjs';
import { createSkinIndex } from './skinindex.mjs';
import { createHairMaterial, growBrows, growLashes, growScalpHair, lidMargin, makeStrandMesh, scalpMask, updateStrandMesh } from './hair.mjs';
import { bindLid, bindMeasurements, buildFaceChannels, FACE_DEFAULTS, FACE_PARAMS, FACE_PARAM_BY_KEY, faceWeights, measureFace, solveFaceParam } from './faceparams.mjs';
import { eyeCentres } from './eyelayout.mjs';
import { DEFAULT_HAIR, HAIR_SHADES, HAIR_STYLES, HAIR_TEXTURES, resolveHair } from './hairstyles.mjs';
import { LIP_COLORS, SCLERA, SKIN_TONES, UNDERTONES, lipFromSkin } from './palettes.mjs';
import { IRIS_COLORS, IRIS_MM, PUPIL_MM } from './eyes.mjs';
import { aimEyes, buildEyes, createCorneaMaterial, createEyeMaterial, makeEyeMeshes, updateEyes } from './eyes.mjs';

/** Body regions, as joint groups of the preview mesh (see joint order in the asset). */
const ZONES = {
  head: { groups: [5] },
  neck: { groups: [4] },
  shoulders: { groups: [6, 10] },
  chest: { groups: [3] },
  core: { groups: [1, 2] },
  hips: { groups: [0, 14, 17], minY: -0.02 },
  arms: { groups: [7, 11, 8, 12] },
  hands: { groups: [9, 13] },
  thighs: { groups: [14, 17], maxY: -0.02 },
  calves: { groups: [15, 18] },
  feet: { groups: [16, 19] },
  // Framing-only zones used by the page's measurement guides.
  leftArm: { groups: [7, 8] },
  leftThigh: { groups: [14], maxY: 0.1 },
  leftCalf: { groups: [15] },
  leftLower: { groups: [15, 16] },
  upperBody: { groups: [3, 4, 6, 7, 10, 11] },
};
export const ZONE_KEYS = Object.keys(ZONES);
export { FACE_PARAMS, HAIR_SHADES, HAIR_STYLES, HAIR_TEXTURES, IRIS_COLORS, LIP_COLORS, SCLERA, SKIN_TONES, UNDERTONES };
const inZone = (zone, group, y) => zone.groups.includes(group) && (zone.minY === undefined || group === 0 || y >= zone.minY) && (zone.maxY === undefined || y <= zone.maxY);

const LIGHTING = {
  studio: { key: ['#fff6ea', 1.6], fill: ['#dbe7ff', 0.35], rim: ['#ffffff', 0.9], hemi: ['#f3f6f4', '#a9b3ad', 0.32], env: 0.42 },
  warm: { key: ['#ffc98a', 1.7], fill: ['#ffd9b8', 0.25], rim: ['#ffb36b', 0.8], hemi: ['#ffe9d2', '#8a7566', 0.3], env: 0.3 },
  cool: { key: ['#e6f0ff', 1.7], fill: ['#bcd6ff', 0.5], rim: ['#d7e6ff', 1.0], hemi: ['#e6efff', '#8d99aa', 0.38], env: 0.45 },
};
const ACCENT = '#0fb5a0';
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const toLinear = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

async function loadTexture(bytes, mime) {
  const bitmap = await createImageBitmap(new Blob([bytes], { type: mime }), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  const texture = new Texture(bitmap);
  texture.flipY = false; texture.colorSpace = SRGBColorSpace; texture.minFilter = LinearMipmapLinearFilter; texture.anisotropy = 4; texture.needsUpdate = true;
  return texture;
}

/** Per-vertex neighbour smoothing that ignores UV seams (works on welded ids). */
function makeSmoother(idx, weld) {
  const n = weld.count; const degree = new Uint16Array(n);
  const pairs = [];
  for (let t = 0; t < idx.length; t += 3) for (let k = 0; k < 3; k += 1) { const a = weld.ids[idx[t + k]]; const b = weld.ids[idx[t + (k + 1) % 3]]; pairs.push(a, b, b, a); }
  for (let i = 0; i < pairs.length; i += 2) degree[pairs[i]] += 1;
  const offset = new Uint32Array(n + 1); for (let i = 0; i < n; i += 1) offset[i + 1] = offset[i] + degree[i];
  const fill = offset.slice(0, n); const neighbours = new Uint32Array(pairs.length / 2);
  for (let i = 0; i < pairs.length; i += 2) neighbours[fill[pairs[i]]++] = pairs[i + 1];
  return (mask, passes = 2) => {
    let current = new Float32Array(n);
    for (let v = 0; v < mask.length; v += 1) current[weld.ids[v]] = Math.max(current[weld.ids[v]], mask[v]);
    for (let p = 0; p < passes; p += 1) {
      const next = new Float32Array(n);
      for (let i = 0; i < n; i += 1) { let sum = current[i] * 2; for (let k = offset[i]; k < offset[i + 1]; k += 1) sum += current[neighbours[k]]; next[i] = sum / (2 + degree[i]); }
      current = next;
    }
    const out = new Float32Array(mask.length); for (let v = 0; v < mask.length; v += 1) out[v] = current[weld.ids[v]];
    return out;
  };
}

export async function createStage(container, options = {}) {
  const preview = options.preview || window.PLAN_HUMAN_PREVIEW;
  if (!preview) throw new Error('The 3D preview data is missing.');
  const canvas = document.createElement('canvas');
  canvas.className = 'stage-canvas'; canvas.setAttribute('aria-hidden', 'true');
  container.prepend(canvas);
  let renderer;
  try { renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: !!options.preserveDrawingBuffer, powerPreference: 'high-performance' }); } catch { canvas.remove(); throw new Error('WebGL is not available in this browser.'); }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = NeutralToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFShadowMap;
  const labelLayer = document.createElement('div'); labelLayer.className = 'stage-labels'; container.append(labelLayer);

  const D = await decodePreview(preview);
  const model = buildModel(D);
  const count = D.body.count;
  const heightM = D.height;

  // ---- scene, light, camera -----------------------------------------------------
  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const hemi = new HemisphereLight(); scene.add(hemi);
  const key = new DirectionalLight(); key.position.set(2.2, 3.4, 3.2); scene.add(key);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.004; key.shadow.radius = 3;
  Object.assign(key.shadow.camera, { left: -1.3, right: 1.3, top: 1.5, bottom: -1.3, near: 1, far: 9 }); key.shadow.camera.updateProjectionMatrix();
  key.target.position.set(0, 0.9, 0); scene.add(key.target);
  const fill = new DirectionalLight(); fill.position.set(-3, 1.6, 2); scene.add(fill);
  const rim = new DirectionalLight(); rim.position.set(-1.2, 2.6, -3.4); scene.add(rim);
  function setLighting(name) {
    const L = LIGHTING[name] || LIGHTING.studio;
    key.color.set(L.key[0]); key.intensity = L.key[1]; fill.color.set(L.fill[0]); fill.intensity = L.fill[1];
    rim.color.set(L.rim[0]); rim.intensity = L.rim[1]; hemi.color.set(L.hemi[0]); hemi.groundColor.set(L.hemi[1]); hemi.intensity = L.hemi[2];
    scene.environmentIntensity = L.env; invalidate();
  }

  const camera = new PerspectiveCamera(27, 1, 0.1, 40);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.09; controls.rotateSpeed = 0.8; controls.zoomSpeed = 0.8;
  controls.minDistance = 0.2; controls.maxDistance = 6.5; controls.minPolarAngle = 0.25; controls.maxPolarAngle = Math.PI * 0.58;
  controls.screenSpacePanning = true; controls.zoomToCursor = false;
  controls.addEventListener('change', () => invalidate());

  // Ground contact shadow.
  {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)'); grad.addColorStop(0.55, 'rgba(0,0,0,0.18)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    const blob = new Mesh(new PlaneGeometry(1.5, 1.1), new MeshBasicMaterial({ map: new CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.5 }));
    blob.rotation.x = -Math.PI / 2; blob.position.set(0, 0.002, 0.02); scene.add(blob);
  }

  // ---- materials ------------------------------------------------------------------------
  const skinMap = await loadTexture(D.skin.bytes, D.skin.mime);
  const skin = createSkinMaterial({ map: skinMap, mean: D.meanAlbedo.map(toLinear) });
  const skinMaterial = skin.material; const uniforms = skin.uniforms;
  // The "other" body in compare views: a soft teal rim light, drawn over everything, so the
  // goal's contour is visible both outside and inside the solid body.
  const ghostMaterial = new ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false, side: DoubleSide, uniforms: { uCol: { value: new Color(ACCENT) } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main() { vec4 mv = modelViewMatrix * vec4( position, 1.0 ); vN = normalize( normalMatrix * normal ); vV = normalize( -mv.xyz ); gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform vec3 uCol;
varying vec3 vN;
varying vec3 vV;
void main() {
  float f = pow( 1.0 - abs( dot( normalize( vN ), normalize( vV ) ) ), 1.6 );
  gl_FragColor = vec4( uCol, 0.07 + 0.8 * f );
  #include <colorspace_fragment>
}`,
  });

  const eye = createEyeMaterial(); const corneaMaterial = createCorneaMaterial();
  const eyeLayout = buildEyes(D.parts.eyes);
  // Hair: strand sets are grown on the base head and follow the skin through morphs.
  const baseNormals = vertexNormals(D.body.pos, D.body.idx, model.weld, new Float32Array(count * 3));
  const skinIndex = createSkinIndex(D.body.pos, D.body.idx, t => D.body.pos[D.body.idx[t * 3] * 3 + 1] > 0.55 && D.body.pos[D.body.idx[t * 3 + 1] * 3 + 1] > 0.55);
  const hairCtx = { pos: D.body.pos, idx: D.body.idx, normals: baseNormals, skin: skinIndex, LM, browGuide: D.parts.brows.pos, eyes: eyeLayout };
  // Face shape channels (generated bumps) join the asset's own morphs; measurements read the drawn shape back.
  const faceCh = buildFaceChannels(D, skinIndex, eyeLayout);
  Object.assign(D.body.morphs, faceCh.body); Object.assign(D.parts.eyes.morphs, faceCh.eyes);
  const faceBind = bindMeasurements(skinIndex, faceCh.points);
  bindLid(faceBind, lidMargin(hairCtx, eyeLayout[0], 180));
  const faceValues = { ...FACE_DEFAULTS }; let faceW = faceWeights(faceValues);
  const hairMat = createHairMaterial(); const browMat = createHairMaterial({ width: 0.00013, shine: 0.35, ao: 0.15 }); const lashMat = createHairMaterial({ width: 0.00011, shine: 0.5, ao: 0.1 });
  const hairMats = [hairMat, browMat, lashMat];

  // ---- shared per-vertex masks -----------------------------------------------------------------
  const smooth = makeSmoother(D.body.idx, model.weld);
  const bodyY = i => D.body.pos[i * 3 + 1];
  const attr = () => { const a = new BufferAttribute(new Float32Array(count), 1); a.setUsage(DynamicDrawUsage); return a; };
  const masks = { aBrief: attr(), aTan: attr(), aPig: attr(), aHi: attr(), aHair: attr() };
  const faceM = faceMasks(D.body.pos, D.body.group);
  const staticAttrs = { aFaceA: new BufferAttribute(faceM.A, 4), aFaceB: new BufferAttribute(faceM.B, 4), aBase: new BufferAttribute(D.body.pos.slice(), 3) };
  // A linear ramp in height (not a thresholded bone group) keeps the hems straight:
  // the shader cuts at 0.5, and interpolation of a linear ramp is exact on every triangle.
  const brief = new Float32Array(count);
  for (let v = 0; v < count; v += 1) {
    const y = bodyY(v); const arm = [6, 7, 8, 9, 10, 11, 12, 13].includes(D.body.group[v]);
    brief[v] = arm ? 0 : Math.min(1, Math.max(0, Math.min(0.5 + (0.17 - y) / 0.06, 0.5 + (y + 0.05) / 0.06)));
  }
  masks.aBrief.array.set(brief);
  const briefMask = masks.aBrief.array;

  const look = { skin: '#bc8970', pigment: { on: false, color: '#996951' }, tan: { amount: 0, pattern: 'tee' }, briefs: '#2f3b4a', under: 'Neutral', freckles: 0, blush: 0.7, shine: 0.5, pores: 1, lip: null, lipGloss: 0.6 };
  function tanExposure(pattern) {
    const out = new Float32Array(count);
    const J = D.joints; const sh = J.LeftUpperArm; const el = J.LeftForeArm;
    const ax = [el[0] - sh[0], el[1] - sh[1], el[2] - sh[2]]; const axLen2 = ax[0] ** 2 + ax[1] ** 2 + ax[2] ** 2;
    for (let v = 0; v < count; v += 1) {
      const g = D.body.group[v]; const y = bodyY(v); const x = Math.abs(D.body.pos[v * 3]);
      let e = 0;
      if (pattern === 'even') e = 1;
      else if (pattern === 'swim') e = 1 - smoothstep(0.42, 0.58, briefMask[v]);
      else if ([5, 4, 9, 13, 8, 12, 15, 18, 16, 19].includes(g)) e = 1;
      else if (g === 7 || g === 11) { const t = ((x - Math.abs(sh[0])) * Math.sign(ax[0]) * ax[0] + (y - sh[1]) * ax[1]) / axLen2; e = smoothstep(0.32, 0.5, t); }
      else if (g === 14 || g === 17) e = smoothstep(-0.16, -0.25, y) > 0 ? 1 - smoothstep(-0.25, -0.16, y) : 0;
      out[v] = e;
    }
    return smooth(out, 2);
  }
  function pigmentMask() {
    const out = new Float32Array(count); if (!look.pigment.on) return out;
    for (let v = 0; v < count; v += 1) out[v] = D.body.group[v] === 8 ? 1 : 0;
    return smooth(out, 2);
  }
  function highlightMask(keys) {
    const out = new Float32Array(count); if (!keys || !keys.length) return out;
    const zones = keys.map(k => ZONES[k]).filter(Boolean);
    for (let v = 0; v < count; v += 1) { const y = bodyY(v); out[v] = zones.some(z => inZone(z, D.body.group[v], y)) ? 1 : 0; }
    return smooth(out, 2);
  }
  function refreshMasks() { masks.aTan.array.set(tanExposure(look.tan.pattern)); masks.aTan.needsUpdate = true; masks.aPig.array.set(pigmentMask()); masks.aPig.needsUpdate = true; masks.aBrief.needsUpdate = true; }

  function setLook(next = {}) {
    if (next.skin) look.skin = next.skin;
    if (next.pigment) look.pigment = { ...look.pigment, ...next.pigment };
    if (next.tan) look.tan = { ...look.tan, ...next.tan };
    if (next.briefs) look.briefs = next.briefs;
    for (const k of ['under', 'freckles', 'blush', 'shine', 'pores', 'lipGloss']) if (next[k] !== undefined) look[k] = next[k];
    if (next.lip !== undefined) look.lip = next.lip;
    uniforms.uSkin.value.set(look.skin); uniforms.uPig.value.set(look.pigment.color); uniforms.uBrief.value.set(look.briefs);
    uniforms.uUnder.value.set(...(UNDERTONES[look.under] || UNDERTONES.Neutral)); uniforms.uFreckle.value = look.freckles; uniforms.uBlush.value = look.blush;
    uniforms.uOily.value = look.shine; skinMaterial.roughness = 0.62 - 0.14 * look.shine; uniforms.uPore.value = look.pores; uniforms.uLipGloss.value = look.lipGloss;
    uniforms.uLip.value.copy(look.lip ? new Color(look.lip) : lipFromSkin(new Color(look.skin)));
    uniforms.uTan.value = look.tan.amount;
    if (next.tan?.pattern || next.pigment) refreshMasks();
    invalidate();
  }

  // ---- figures ---------------------------------------------------------------------------------------
  const sharedUv = new BufferAttribute(D.body.uv, 2); const sharedIndex = new BufferAttribute(D.body.idx, 1);
  const figures = {};
  function makeFigure(slot) {
    const group = new Group(); scene.add(group);
    const geometry = new BufferGeometry();
    const pos = new BufferAttribute(D.body.pos.slice(), 3); pos.setUsage(DynamicDrawUsage);
    const nrm = new BufferAttribute(new Float32Array(count * 3), 3); nrm.setUsage(DynamicDrawUsage);
    geometry.setAttribute('position', pos); geometry.setAttribute('normal', nrm); geometry.setAttribute('uv', sharedUv); geometry.setIndex(sharedIndex);
    for (const [name, a] of Object.entries({ ...masks, ...staticAttrs })) geometry.setAttribute(name, a);
    const body = new Mesh(geometry, skinMaterial); body.frustumCulled = false; body.castShadow = true; body.receiveShadow = true; group.add(body);
    // Eyes: two meshes with their own pivots; the other part meshes (brows, lashes) are only guides.
    const eyeData = eyeLayout; const eyeMeshes = makeEyeMeshes(eyeData, eye.material, corneaMaterial);
    eyeMeshes.forEach(m => group.add(m));
    const partPos = { eyes: D.parts.eyes.pos.slice() };
    const overlay = new Group(); group.add(overlay);
    return { slot, group, body, geometry, pos, nrm, eyeData, eyeMeshes, partPos, overlay, hair: {}, fit: null, mode: 'solid' };
  }
  figures.primary = makeFigure('primary');
  figures.secondary = makeFigure('secondary'); figures.secondary.group.visible = false;

  const fitCache = new Map();
  function fit(entries) {
    const keyStr = JSON.stringify(Object.entries(entries || {}).filter(([, v]) => Number(v) > 0).sort());
    if (!fitCache.has(keyStr)) { if (fitCache.size > 60) fitCache.clear(); fitCache.set(keyStr, fitEntries(model, entries)); }
    return fitCache.get(keyStr);
  }
  function placeFigure(fig, scale) {
    fig.group.scale.setScalar(scale);
    fig.group.position.y = -model.floorY * scale;
  }
  function apply(result, slot = 'primary') {
    const fig = figures[slot];
    const weights = { ...result.weights, ...faceW };
    applyMorphs(D.body.pos, D.body.morphs, weights, fig.pos.array);
    vertexNormals(fig.pos.array, D.body.idx, model.weld, fig.nrm.array);
    fig.pos.needsUpdate = true; fig.nrm.needsUpdate = true; fig.geometry.computeBoundingSphere();
    applyMorphs(D.parts.eyes.pos, D.parts.eyes.morphs, weights, fig.partPos.eyes);
    updateEyes(fig.eyeData, fig.eyeMeshes, fig.partPos.eyes, D.parts.eyes.pos);
    for (const mesh of Object.values(fig.hair)) updateStrandMesh(mesh, D.body.idx, fig.pos.array);
    fig.fit = result; placeFigure(fig, result.scale);
    if (slot === 'primary') rebuildOverlay();
    invalidate();
  }
  /** Blend two fits (shape weights and height) — used by the History scrubber. */
  function blend(a, b, t) {
    const weights = {}; for (const k of new Set([...Object.keys(a.weights), ...Object.keys(b.weights)])) weights[k] = (a.weights[k] || 0) * (1 - t) + (b.weights[k] || 0) * t;
    return { weights, scale: a.scale * (1 - t) + b.scale * t, report: t < 0.5 ? a.report : b.report };
  }
  const measure = result => measureAll(model, result);

  // ---- hair, brows, lashes ---------------------------------------------------------------------------------
  const hairLook = { ...DEFAULT_HAIR, hairline: { ...DEFAULT_HAIR.hairline } };
  const browLook = { density: 1, length: 1, lift: 0, thick: 0, tail: 1, shade: null };
  const lashLook = { density: 1, length: 1, curl: 1 };
  const strands = { scalp: null, brows: null, lashes: null };
  const lowPower = (typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 8) <= 4) || window.innerWidth < 700;
  function attachStrands(kind, set, material) {
    for (const fig of Object.values(figures)) {
      if (fig.hair[kind]) { fig.group.remove(fig.hair[kind]); fig.hair[kind].geometry.dispose(); delete fig.hair[kind]; }
      if (!set) continue;
      const mesh = makeStrandMesh(set, material); fig.group.add(mesh); fig.hair[kind] = mesh;
      if (fig.fit) updateStrandMesh(mesh, D.body.idx, fig.pos.array);
    }
  }
  function refreshHairColours(r) {
    const base = new Color(r.color);
    hairMat.uniforms.uColor.value.copy(base); hairMat.uniforms.uTip.value.copy(base).multiplyScalar(1.12);
    hairMat.uniforms.uGrey.value = r.grey; hairMat.uniforms.uShine.value = r.shine; hairMat.uniforms.uWidth.value = r.width * 2.6 * (1 + Math.min(0.15, r.maxLen) * 6);
    const brow = browLook.shade ? new Color(browLook.shade) : base.clone().multiplyScalar(0.9);
    browMat.uniforms.uColor.value.copy(brow); browMat.uniforms.uTip.value.copy(brow); browMat.uniforms.uGrey.value = r.grey * 0.6;
    const lash = base.clone().lerp(new Color('#0b0806'), 0.55);
    lashMat.uniforms.uColor.value.copy(lash); lashMat.uniforms.uTip.value.copy(lash); lashMat.uniforms.uGrey.value = 0;
    uniforms.uHairCol.value.copy(base).multiplyScalar(0.5);
    uniforms.uScalp.value = r.bald ? r.stubble : Math.max(0.35, 0.9 - 0.25 * (1 - Math.min(1, r.density)));
  }
  function rebuildHair({ scalp = true, brows = false, lashes = false } = {}) {
    const r = resolveHair(hairLook);
    if (scalp) {
      strands.scalp = growScalpHair(hairCtx, r, { budget: lowPower ? 420000 : 900000 });
      attachStrands('scalp', strands.scalp, hairMat.material);
      masks.aHair.array.set(scalpMask(D.body.pos, D.body.group, r.hairline, LM)); masks.aHair.needsUpdate = true;
    }
    if (brows) { strands.brows = growBrows(hairCtx, browLook); attachStrands('brows', strands.brows, browMat.material); }
    if (lashes) { strands.lashes = growLashes(hairCtx, lashLook); attachStrands('lashes', strands.lashes, lashMat.material); }
    refreshHairColours(r); invalidate();
    return r;
  }
  function setHair(next = {}) {
    const geometryChange = ['style', 'texture', 'length', 'density', 'part', 'volume', 'hairline'].some(k => next[k] !== undefined);
    for (const [k, v] of Object.entries(next)) hairLook[k] = k === 'hairline' ? { ...hairLook.hairline, ...v } : v;
    if (next.shade && !next.color) hairLook.color = null;
    return rebuildHair({ scalp: geometryChange || !strands.scalp });
  }
  function setBrows(next = {}) { Object.assign(browLook, next); return rebuildHair({ scalp: false, brows: true }); }
  function setLashes(next = {}) { Object.assign(lashLook, next); return rebuildHair({ scalp: false, lashes: true }); }
  const lightRig = { key, fill, rim, hemi };
  function updateHairUniforms() {
    const v = new Vector3(); const lights = [key, fill, rim]; const px = (2 * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(1, canvas.height);
    for (const m of hairMats) {
      const u = m.uniforms; u.uPx.value = px;
      lights.forEach((l, i) => {
        v.copy(l.position).sub(l.target.position).normalize().transformDirection(camera.matrixWorldInverse); u.uLd.value[i].copy(v);
        u.uLc.value[i].copy(l.color).multiplyScalar(l.intensity * 0.5);
      });
      u.uSky.value.copy(lightRig.hemi.color).multiplyScalar(lightRig.hemi.intensity * 1.1 + scene.environmentIntensity * 0.35);
      u.uGround.value.copy(lightRig.hemi.groundColor).multiplyScalar(lightRig.hemi.intensity * 0.7 + scene.environmentIntensity * 0.2);
    }
  }

  // ---- eyes ------------------------------------------------------------------------------------------------------
  const eyeLook = { iris: 'Brown', irisMm: IRIS_MM, pupilMm: PUPIL_MM, sclera: 'Natural', redness: 0.18 };
  function setEyes(next = {}) {
    Object.assign(eyeLook, next);
    const preset = IRIS_COLORS[eyeLook.iris];
    const outer = preset ? preset[0] : eyeLook.iris; const inner = preset ? preset[1] : new Color(eyeLook.iris).offsetHSL(0.02, 0.05, 0.1).getStyle();
    eye.uniforms.uIris.value.set(outer); eye.uniforms.uIrisInner.value.set(inner);
    eye.uniforms.uIrisR.value = Math.asin(Math.min(0.9, eyeLook.irisMm / 2 / 12.7)); eye.uniforms.uPupil.value = Math.min(0.8, eyeLook.pupilMm / eyeLook.irisMm);
    eye.uniforms.uSclera.value.set(SCLERA[eyeLook.sclera] || eyeLook.sclera); eye.uniforms.uVein.value = eyeLook.redness;
    invalidate(); return { ...eyeLook };
  }

  // ---- face parameters (mm) ---------------------------------------------------------------------------------
  const faceScratch = new Float32Array(D.body.pos.length); const eyeScratch = new Float32Array(D.parts.eyes.pos.length);
  /** Measurements (mm, deg) of the drawn face for a set of parameter values, at the primary figure's current body shape. */
  function faceMeasureWith(values) {
    const w = { ...(figures.primary.fit?.weights || {}), ...faceWeights(values) };
    applyMorphs(D.body.pos, D.body.morphs, w, faceScratch); applyMorphs(D.parts.eyes.pos, D.parts.eyes.morphs, w, eyeScratch);
    const centres = eyeCentres(eyeLayout, D.parts.eyes.pos, eyeScratch);
    const m = measureFace(faceBind, D.body.idx, faceScratch, centres);
    const k = figures.primary.fit?.scale ?? 1;
    for (const key of Object.keys(m)) if (key !== 'eyeTilt') m[key] *= k;
    return m;
  }
  const zeroFace = Object.fromEntries(FACE_PARAMS.map(p => [p.key, 0]));
  /** Current value of a parameter as the person reads it: the measurement in mm, or the change for ones with no landmark pair. */
  function readParam(p, m) { return p.measure ? m[p.measure] ?? null : null; }
  function reapplyFigures() { for (const slot of ['primary', 'secondary']) if (figures[slot].fit) apply(figures[slot].fit, slot); }
  function setFace(next = {}) {
    for (const [k, v] of Object.entries(next)) if (FACE_PARAM_BY_KEY[k] && Number.isFinite(v)) { const p = FACE_PARAM_BY_KEY[k]; faceValues[k] = Math.min(p.range[1], Math.max(p.range[0], v)); }
    faceW = faceWeights(faceValues); reapplyFigures(); return faceState();
  }
  function faceState() {
    const m = faceMeasureWith(faceValues); const b = faceMeasureWith(zeroFace);
    return FACE_PARAMS.map(p => ({ ...p, value: faceValues[p.key], measured: readParam(p, m), base: readParam(p, b) }));
  }
  /** Set a parameter so the drawn shape measures `target` (mm); returns the state and whether the target was reachable. */
  function solveFace(key, target) {
    const p = FACE_PARAM_BY_KEY[key]; if (!p || !Number.isFinite(target)) return { ok: false, state: faceState() };
    if (!p.measure) return { ok: false, state: setFace({ [key]: target }) };
    const res = solveFaceParam(p, target, faceValues, vals => readParam(p, faceMeasureWith(vals)));
    setFace({ [key]: res.value });
    return { ok: res.ok, reached: res.reached, state: faceState() };
  }
  function resetFace() { Object.assign(faceValues, FACE_DEFAULTS); faceW = faceWeights(faceValues); reapplyFigures(); return faceState(); }

  // ---- compare modes -------------------------------------------------------------------------------
  const compare = { mode: 'off', split: 0.5 };
  function setCompare(next = {}) {
    Object.assign(compare, next);
    const f = figures.secondary;
    f.group.visible = compare.mode !== 'off';
    const ghost = compare.mode === 'ghost';
    f.body.material = ghost ? ghostMaterial : skinMaterial;
    f.eyeMeshes.forEach(m => { m.visible = !ghost; });
    Object.values(f.hair).forEach(m => { m.visible = !ghost; });
    invalidate();
  }

  // ---- overlay: tape loops, spans, labels -------------------------------------------------------------
  let overlayItems = []; const labels = new Map();
  const accent = new Color(ACCENT);
  const disposeGroup = g => { for (const child of [...g.children]) { g.remove(child); child.geometry?.dispose?.(); child.material?.dispose?.(); } };
  function addLoop(fig, loop, quiet) {
    const n = loop.length / 3; const step = Math.max(1, Math.round(n / 96)); const c = loopCentroid(loop); const pts = [];
    for (let i = 0; i < n; i += step) {
      const dx = loop[i * 3] - c[0]; const dz = loop[i * 3 + 2] - c[2]; const len = Math.hypot(dx, dz) || 1;
      pts.push(new Vector3(loop[i * 3] + (dx / len) * 0.0025, loop[i * 3 + 1], loop[i * 3 + 2] + (dz / len) * 0.0025));
    }
    const curve = new CatmullRomCurve3(pts, true, 'centripetal');
    const tube = new Mesh(new TubeGeometry(curve, Math.max(48, pts.length * 2), quiet ? 0.002 : 0.0035, 8, true), new MeshBasicMaterial({ color: accent, transparent: quiet, opacity: quiet ? 0.7 : 1 }));
    tube.renderOrder = 2; fig.overlay.add(tube);
    const dashed = new LineLoop(new BufferGeometry().setFromPoints(curve.getPoints(pts.length * 2).slice(0, -1)), new LineDashedMaterial({ color: accent, dashSize: 0.012, gapSize: 0.01, transparent: true, opacity: 0.85, depthTest: false }));
    dashed.computeLineDistances(); dashed.renderOrder = 3; fig.overlay.add(dashed);
    let best = pts[0]; for (const p of pts) if (p.x > best.x) best = p;
    return best;
  }
  function addSpan(fig, a, b, { through = false, caps = true } = {}) {
    const va = new Vector3(...a); const vb = new Vector3(...b); const dir = vb.clone().sub(va); const len = dir.length();
    const mat = new MeshBasicMaterial({ color: accent, depthTest: !through, transparent: through, opacity: through ? 0.9 : 1 });
    const shaft = new Mesh(new CylinderGeometry(0.0032, 0.0032, len, 8), mat); shaft.position.copy(va).add(vb).multiplyScalar(0.5);
    shaft.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize()); shaft.renderOrder = 2; fig.overlay.add(shaft);
    if (caps) for (const [p, sign] of [[va, -1], [vb, 1]]) {
      const cone = new Mesh(new ConeGeometry(0.0085, 0.024, 12), mat); cone.position.copy(p).addScaledVector(dir.clone().normalize(), -sign * 0.011);
      cone.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize().multiplyScalar(sign)); cone.renderOrder = 2; fig.overlay.add(cone);
    }
    return new Vector3().addVectors(va, vb).multiplyScalar(0.5);
  }
  function addDot(fig, p) { const dot = new Mesh(new SphereGeometry(0.0085, 14, 10), new MeshBasicMaterial({ color: accent, depthTest: false, transparent: true, opacity: 0.95 })); dot.position.set(...p); dot.renderOrder = 4; fig.overlay.add(dot); }
  function addPlane(fig, z, y0, y1, halfWidth) {
    const plane = new Mesh(new PlaneGeometry(halfWidth * 2, y1 - y0), new MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.12, side: DoubleSide, depthWrite: false }));
    plane.position.set(0, (y0 + y1) / 2, z); plane.renderOrder = 1; fig.overlay.add(plane);
    const edge = new Line(new BufferGeometry().setFromPoints([new Vector3(0, y0, z), new Vector3(0, y1, z)]), new LineDashedMaterial({ color: accent, dashSize: 0.012, gapSize: 0.008, depthTest: false }));
    edge.computeLineDistances(); fig.overlay.add(edge);
  }
  function extreme(fig, groups, filter, pick) {
    const p = fig.pos.array; let best = -1; let bestV = pick.dir * -Infinity;
    for (let v = 0; v < count; v += 1) {
      if (!groups.includes(D.body.group[v])) continue;
      const x = p[v * 3]; const y = p[v * 3 + 1]; const z = p[v * 3 + 2];
      if (!filter(x, y, z)) continue;
      const s = [x, y, z][pick.axis]; if (pick.dir * s > pick.dir * bestV) { bestV = s; best = v; }
    }
    return best < 0 ? null : [p[best * 3], p[best * 3 + 1], p[best * 3 + 2]];
  }
  /** Landmark pairs for the straight-line measurements, found on the fitted preview mesh. */
  function landmarks(fig, id) {
    const J = D.joints;
    if (id === 'outerShoulder') {
      const a = extreme(fig, [6, 7], (x, y) => y > 0.52 && y < 0.6, { axis: 0, dir: 1 }); const b = extreme(fig, [10, 11], (x, y) => y > 0.52 && y < 0.6, { axis: 0, dir: -1 });
      return a && b ? { a, b } : null;
    }
    if (id === 'bonyShoulder') {
      const a = extreme(fig, [6, 7], (x, y, z) => Math.abs(x - J.LeftUpperArm[0]) < 0.014 && Math.abs(z - J.LeftUpperArm[2]) < 0.05, { axis: 1, dir: 1 });
      const b = extreme(fig, [10, 11], (x, y, z) => Math.abs(x - J.RightUpperArm[0]) < 0.014 && Math.abs(z - J.RightUpperArm[2]) < 0.05, { axis: 1, dir: 1 });
      return a && b ? { a, b } : null;
    }
    if (id === 'chestDepth') {
      const m = measureSite(model, fig.pos.array, 'chest'); if (!m) return null;
      const L = m.loop; let front = 0; let back = 0;
      for (let i = 0; i < L.length / 3; i += 1) { if (L[i * 3 + 2] > L[front * 3 + 2]) front = i; if (L[i * 3 + 2] < L[back * 3 + 2]) back = i; }
      const x = (L[front * 3] + L[back * 3]) / 2;
      return { a: [x, L[front * 3 + 1], L[front * 3 + 2]], b: [x, L[back * 3 + 1], L[back * 3 + 2]], through: true };
    }
    if (id === 'lowerLeg') return { a: [J.LeftLeg[0], J.LeftLeg[1], J.LeftLeg[2]], b: [J.LeftFoot[0], J.LeftFoot[1], J.LeftFoot[2]], through: true };
    if (id === 'projection') {
      const refZ = J.Hips[2]; const rear = extreme(fig, [0, 14, 17, 1], (x, y) => y > -0.06 && y < 0.12 && Math.abs(x) < 0.2, { axis: 2, dir: -1 });
      return rear ? { a: [rear[0], rear[1], refZ], b: rear, refZ } : null;
    }
    return null;
  }
  function rebuildOverlay() {
    const fig = figures.primary; disposeGroup(fig.overlay);
    for (const l of labels.values()) l.el.remove(); labels.clear();
    for (const item of overlayItems) {
      let anchor = null;
      if (item.type === 'loop') { const m = measureSite(model, fig.pos.array, item.site); if (!m) continue; const p = addLoop(fig, m.loop, item.style === 'quiet'); anchor = [p.x, p.y, p.z]; }
      else if (item.type === 'height') {
        const x = -0.66; const y0 = model.floorY; const y1 = model.floorY + heightM;
        const mid = addSpan(fig, [x, y0 + 0.004, 0.02], [x, y1, 0.02]); anchor = [x, mid.y, 0.02];
        const ext = new Line(new BufferGeometry().setFromPoints([new Vector3(x - 0.04, y1, 0.02), new Vector3(x + 0.18, y1, 0.02)]), new LineDashedMaterial({ color: accent, dashSize: 0.012, gapSize: 0.01, depthTest: false, transparent: true, opacity: 0.7 }));
        ext.computeLineDistances(); fig.overlay.add(ext);
      } else if (item.type === 'span') {
        const lm = landmarks(fig, item.id); if (!lm) continue;
        if (item.id === 'projection') addPlane(fig, lm.refZ, model.floorY + heightM * 0.43, model.floorY + heightM * 0.62, 0.3);
        const mid = addSpan(fig, lm.a, lm.b, { through: lm.through }); addDot(fig, lm.a); addDot(fig, lm.b);
        anchor = [mid.x, mid.y, mid.z]; if (item.id === 'lowerLeg') anchor = [lm.a[0] + 0.05, mid.y, lm.a[2]];
      }
      if (anchor && item.label) {
        const el = document.createElement('div'); el.className = `stage-label${item.style === 'quiet' ? ' is-quiet' : ''}`; el.textContent = item.label;
        el.dataset.side = item.side || 'right'; if (item.onClick) { el.classList.add('is-action'); el.style.pointerEvents = 'auto'; el.tabIndex = 0; el.setAttribute('role', 'button'); el.addEventListener('click', item.onClick); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.onClick(); } }); }
        labelLayer.append(el); labels.set(item, { el, anchor });
      }
    }
    invalidate();
  }
  function setOverlay(items) { overlayItems = items || []; rebuildOverlay(); }
  function positionLabels() {
    const w = container.clientWidth; const h = container.clientHeight; const v = new Vector3();
    for (const { el, anchor } of labels.values()) {
      v.set(...anchor); figures.primary.group.localToWorld(v); v.project(camera);
      const x = (v.x * 0.5 + 0.5) * w; const y = (-v.y * 0.5 + 0.5) * h; const side = el.dataset.side;
      el.style.transform = `translate(${side === 'left' ? 'calc(-100% - 12px)' : '12px'}, -50%) translate(${x}px, ${y}px)`;
      el.style.visibility = v.z > 1 ? 'hidden' : 'visible';
    }
  }

  // ---- camera moves ---------------------------------------------------------------------------------------
  const VIEWS = { front: 0, three: Math.PI * 0.2, side: Math.PI / 2, back: Math.PI };
  let tween = null;
  function flyTo({ target, theta, phi, distance }, ms = 600) {
    const offset = camera.position.clone().sub(controls.target); const sph = new Spherical().setFromVector3(offset);
    const to = { target: target ? target.clone() : controls.target.clone(), theta: theta ?? sph.theta, phi: phi ?? sph.phi, radius: distance ?? sph.radius };
    let dTheta = to.theta - sph.theta; while (dTheta > Math.PI) dTheta -= 2 * Math.PI; while (dTheta < -Math.PI) dTheta += 2 * Math.PI;
    const from = { target: controls.target.clone(), theta: sph.theta, phi: sph.phi, radius: sph.radius };
    const apply1 = t => {
      controls.target.lerpVectors(from.target, to.target, t);
      const s = new Spherical(from.radius + (to.radius - from.radius) * t, from.phi + (to.phi - from.phi) * t, from.theta + dTheta * t);
      camera.position.copy(controls.target).add(new Vector3().setFromSpherical(s)); camera.lookAt(controls.target);
    };
    if (reduceMotion() || ms <= 0) { apply1(1); tween = null; invalidate(); return; }
    tween = { start: performance.now(), ms, apply1 }; invalidate();
  }
  const fovHalf = () => Math.tan((camera.fov * Math.PI) / 360);
  function frameBox(min, max, margin = 1.18) {
    const size = new Vector3().subVectors(max, min); const center = new Vector3().addVectors(min, max).multiplyScalar(0.5);
    const aspect = camera.aspect || 1;
    const distance = Math.max(size.y / 2 / fovHalf(), size.x / 2 / (fovHalf() * aspect), 0.3) * margin + size.z / 2;
    return { target: center, distance };
  }
  function bodyBounds(zoneKeys) {
    const fig = figures.primary; const p = fig.pos.array; const min = new Vector3(Infinity, Infinity, Infinity); const max = new Vector3(-Infinity, -Infinity, -Infinity);
    const zones = zoneKeys ? zoneKeys.map(k => ZONES[k]).filter(Boolean) : null;
    for (let v = 0; v < count; v += 1) {
      if (zones && !zones.some(z => inZone(z, D.body.group[v], p[v * 3 + 1]))) continue;
      const q = new Vector3(p[v * 3], p[v * 3 + 1], p[v * 3 + 2]); fig.group.localToWorld(q); min.min(q); max.max(q);
    }
    return { min, max };
  }
  function setView(name = 'front', { zone = null, ms = 600, margin = null } = {}) {
    const theta = VIEWS[name] ?? 0; const phi = Math.PI / 2 - 0.2;
    if (zone) {
      const keys = Array.isArray(zone) ? zone : [zone]; const { min, max } = bodyBounds(keys);
      const f = frameBox(min, max, margin ?? (keys.includes('hands') || keys.includes('feet') || keys.includes('head') ? 2.3 : 2.1));
      flyTo({ target: f.target, theta, phi, distance: Math.max(0.9, f.distance) }, ms);
    } else {
      const s = figures.primary.fit?.scale ?? 1; const { min, max } = (() => { const lo = new Vector3(-0.62, 0, -0.1); const hi = new Vector3(0.62, heightM * s, 0.1); return { min: lo, max: hi }; })();
      const f = frameBox(min, max, 1.24);
      flyTo({ target: f.target, theta, phi, distance: f.distance }, ms);
    }
  }

  /** Close camera on a point of the primary figure (model-space metres), e.g. the face. */
  function focusOn(point, { distance = 0.6, theta = 0, phi = Math.PI / 2 - 0.05, ms = 600 } = {}) {
    const v = new Vector3(...point); figures.primary.group.localToWorld(v);
    flyTo({ target: v, theta, phi, distance }, ms);
  }

  // ---- render loop ----------------------------------------------------------------------------------------
  let dirty = true; let raf = 0; let autoRotate = false;
  function invalidate() { dirty = true; if (!raf) raf = requestAnimationFrame(frame); }
  function renderScene() {
    const { x: w, y: h } = renderer.getSize(new Vector2());
    renderer.setViewport(0, 0, w, h);
    camera.updateMatrixWorld(); updateHairUniforms();
    for (const fig of Object.values(figures)) aimEyes(fig.eyeMeshes, fig.group, camera.position);
    if (compare.mode === 'split') {
      const cut = Math.round(w * compare.split);
      renderer.setScissorTest(true);
      figures.primary.group.visible = true; figures.secondary.group.visible = false;
      renderer.setScissor(0, 0, cut, h); renderer.render(scene, camera);
      figures.primary.group.visible = false; figures.secondary.group.visible = true;
      renderer.setScissor(cut, 0, w - cut, h); renderer.render(scene, camera);
      figures.primary.group.visible = true;
      renderer.setScissorTest(false);
    } else renderer.render(scene, camera);
  }
  function frame(now) {
    raf = 0;
    let more = false;
    if (tween) { const t = Math.min(1, (now - tween.start) / tween.ms); const e = 1 - (1 - t) ** 3; tween.apply1(e); if (t >= 1) tween = null; else more = true; dirty = true; }
    if (autoRotate && !reduceMotion()) { controls.autoRotate = true; controls.autoRotateSpeed = 1.4; }
    else controls.autoRotate = false;
    if (controls.update()) more = true;
    if (controls.autoRotate) more = true;
    if (dirty || more) { renderScene(); positionLabels(); dirty = false; }
    if (more) raf = requestAnimationFrame(frame);
  }
  function resize() {
    const w = Math.max(1, container.clientWidth); const h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); invalidate();
  }
  const observer = new ResizeObserver(resize); observer.observe(container);

  // ---- picking ----------------------------------------------------------------------------------------------
  const listeners = {}; const emit = (name, value) => (listeners[name] || []).forEach(cb => cb(value));
  const raycaster = new Raycaster(); let downAt = null;
  /** The body region under a screen point, or null. */
  function pickAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect(); const ndc = new Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    figures.primary.group.updateMatrixWorld(true);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(figures.primary.body, false)[0];
    if (!hit) return null;
    const v = D.body.idx[hit.faceIndex * 3]; const y = figures.primary.pos.array[v * 3 + 1];
    return Object.keys(ZONES).find(k => inZone(ZONES[k], D.body.group[v], y)) || null;
  }
  canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) { downAt = null; return; }
    downAt = null;
    const zone = pickAt(e.clientX, e.clientY);
    if (zone) emit('pick', zone);
  });

  // ---- finish ----------------------------------------------------------------------------------------------
  refreshMasks(); setLook({}); setLighting('studio');
  const initial = fit({});
  apply(initial, 'primary'); apply(initial, 'secondary');
  rebuildHair({ scalp: true, brows: true, lashes: true });
  resize(); setView('front', { ms: 0 });

  return {
    zones: ZONE_KEYS, sites: Object.keys(SITES), baseHeightCm: heightM * 100,
    fit, apply, blend, measure, setView, focusOn, setLook, setHair, setBrows, setLashes, hairLook: () => JSON.parse(JSON.stringify(hairLook)),
    setFace, solveFace, resetFace, faceState, setEyes, eyeLook: () => ({ ...eyeLook }), skinLook: () => JSON.parse(JSON.stringify(look)), setLighting, setOverlay, setCompare,
    setHighlight(keys, amount = 1) { masks.aHi.array.set(highlightMask(keys)); masks.aHi.needsUpdate = true; uniforms.uHi.value = keys && keys.length ? amount : 0; invalidate(); },
    setAutoRotate(on) { autoRotate = !!on; invalidate(); },
    landmarkCm(id) { const lm = landmarks(figures.primary, id); if (!lm) return null; const s = figures.primary.fit.scale * 100; return Math.hypot(lm.a[0] - lm.b[0], lm.a[1] - lm.b[1], lm.a[2] - lm.b[2]) * s; },
    projectionCm() { const lm = landmarks(figures.primary, 'projection'); return lm ? (lm.refZ - lm.b[2]) * figures.primary.fit.scale * 100 : null; },
    /** Top-down outline of the fitted body at a tape site, in cm, centred on the slice (front is up). */
    sliceOutline(site) {
      const fig = figures.primary; const m = measureSite(model, fig.pos.array, site); const def = model.sites[site];
      if (!m || !def) return null;
      const len = Math.hypot(...def.normal); const n = def.normal.map(v => v / len); const r = [0, 0, 1];
      let u = [r[1] * n[2] - r[2] * n[1], r[2] * n[0] - r[0] * n[2], r[0] * n[1] - r[1] * n[0]]; const ul = Math.hypot(...u);
      u = ul < 1e-6 ? [1, 0, 0] : u.map(v => v / ul);
      const v = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
      const c = loopCentroid(m.loop); const k = fig.fit.scale * 100; const points = [];
      let minU = Infinity; let maxU = -Infinity; let minV = Infinity; let maxV = -Infinity;
      for (let i = 0; i < m.loop.length; i += 3) {
        const dx = m.loop[i] - c[0]; const dy = m.loop[i + 1] - c[1]; const dz = m.loop[i + 2] - c[2];
        const a = (dx * u[0] + dy * u[1] + dz * u[2]) * k; const b = (dx * v[0] + dy * v[1] + dz * v[2]) * k;
        points.push([a, b]); minU = Math.min(minU, a); maxU = Math.max(maxU, a); minV = Math.min(minV, b); maxV = Math.max(maxV, b);
      }
      return { points, width: maxU - minU, depth: maxV - minV, girth: loopLength(m.loop) * k };
    },
    pickAt, on(name, cb) { (listeners[name] = listeners[name] || []).push(cb); },
    resize, invalidate,
    /** Resolves once nothing is waiting to be drawn (camera moves, queued frames). Useful for tests and screenshots. */
    idle() { return new Promise(resolve => { const check = () => (dirty || raf || tween ? setTimeout(check, 30) : resolve()); check(); }); },
    ...(options.debug ? { internals: { D, faceCh, faceBind, hairCtx, eyeLayout, strands } } : {}),
    snapshot() { renderScene(); return canvas.toDataURL('image/png'); },
    dispose() { observer.disconnect(); renderer.dispose(); canvas.remove(); labelLayer.remove(); },
    get camera() { return camera; }, get controls() { return controls; },
  };
}
