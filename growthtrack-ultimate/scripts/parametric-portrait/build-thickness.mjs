import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshBVH } from 'three-mesh-bvh';
import { png } from '../human75/micro.mjs';
import { preintegratedDiffusion, SKIN_DIFFUSION_DISTANCE_MM, SKIN_DIFFUSION_MAX_CURVATURE_PER_MM, SKIN_THICKNESS_MAX_MM } from '../../src/components/body3d/skinDiffusionProfile.js';
import { traceNormalChord } from './build-thickness-core.mjs';

const basisPath = 'public/assets/models/parametric-base-v1.glb';
const basisSha256 = '6627588660aa6c754aaa2edb181bc01a8ca60c3b4c534efa3e87f636ce5cda18';
const output = 'public/assets/parametric/skin', size = 1024, lutSize = 128;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = await readFile(basisPath);
if (sha(bytes) !== basisSha256) throw new Error('The thickness bake requires the pinned canonical body.');
const data = new ArrayBuffer(bytes.length); new Uint8Array(data).set(bytes);
const { scene } = await new GLTFLoader().parseAsync(data, '');
const body = scene.getObjectByName('Body'), geometry = body?.geometry;
if (!geometry?.index || geometry.attributes.position.count !== 14517 || !geometry.attributes.normal || !geometry.attributes.uv) throw new Error('Unsupported thickness topology.');
const points = geometry.attributes.position, normals = geometry.attributes.normal, uv = geometry.attributes.uv, indices = geometry.index;
const bvh = new MeshBVH(geometry, { indirect: true, maxLeafTris: 8 });
const epsilonMetres = 0.00005, maxRayMetres = 0.6;
const thickness = new Float32Array(points.count), confidence = new Uint8Array(points.count);
const point = new Vector3(), normal = new Vector3();
const measured = [];
for (let vertex = 0; vertex < points.count; vertex++) {
  point.fromBufferAttribute(points, vertex); normal.fromBufferAttribute(normals, vertex).normalize();
  // Starting inside and accepting only back-face intersections asks for the
  // exit surface, rather than an immediate hit on the starting triangle.
  const chord = traceNormalChord(bvh, point, normal, { epsilonMetres, maximumRayMetres: maxRayMetres });
  const distanceMm = chord === null ? Infinity : chord * 1000;
  if (Number.isFinite(distanceMm) && distanceMm > epsilonMetres * 2000 && distanceMm < maxRayMetres * 1000) {
    thickness[vertex] = Math.min(SKIN_THICKNESS_MAX_MM, distanceMm); confidence[vertex] = 1; measured.push(distanceMm);
  } else thickness[vertex] = SKIN_THICKNESS_MAX_MM;
}
if (measured.length < points.count * 0.8) throw new Error(`Only ${measured.length}/${points.count} vertices had a usable thickness exit.`);

const pixels = new Uint8Array(size * size * 4), occupied = new Uint8Array(size * size);
for (let pixel = 0; pixel < size * size; pixel++) pixels.set([255, 255, 0, 255], pixel * 4);
for (let triangle = 0; triangle < indices.count; triangle += 3) {
  const ids = [indices.getX(triangle), indices.getX(triangle + 1), indices.getX(triangle + 2)];
  const [[ax, ay], [bx, by], [cx, cy]] = ids.map(index => [uv.getX(index) * size, uv.getY(index) * size]);
  const denominator = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
  if (Math.abs(denominator) < 1e-10) continue;
  const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx))), maxX = Math.min(size - 1, Math.ceil(Math.max(ax, bx, cx)));
  const minY = Math.max(0, Math.floor(Math.min(ay, by, cy))), maxY = Math.min(size - 1, Math.ceil(Math.max(ay, by, cy)));
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const a = ((by - cy) * (x + 0.5 - cx) + (cx - bx) * (y + 0.5 - cy)) / denominator;
    const b = ((cy - ay) * (x + 0.5 - cx) + (ax - cx) * (y + 0.5 - cy)) / denominator, c = 1 - a - b;
    if (Math.min(a, b, c) < -1e-6) continue;
    const value = thickness[ids[0]] * a + thickness[ids[1]] * b + thickness[ids[2]] * c;
    const encoded = Math.round(Math.max(0, Math.min(1, value / SKIN_THICKNESS_MAX_MM)) * 65535);
    const valid = Math.min(...ids.map(index => confidence[index]));
    const pixel = y * size + x; occupied[pixel] = 1;
    pixels.set([encoded >> 8, encoded & 255, valid * 255, 255], pixel * 4);
  }
}
for (let pass = 0; pass < 4; pass++) {
  const next = occupied.slice();
  for (let pixel = 0; pixel < occupied.length; pixel++) if (!occupied[pixel]) {
    const x = pixel % size, y = Math.floor(pixel / size);
    const neighbour = [x ? pixel - 1 : -1, x + 1 < size ? pixel + 1 : -1, y ? pixel - size : -1, y + 1 < size ? pixel + size : -1].find(index => index >= 0 && occupied[index]);
    if (neighbour !== undefined) { pixels.copyWithin(pixel * 4, neighbour * 4, neighbour * 4 + 4); next[pixel] = 1; }
  }
  occupied.set(next);
}

const lut = new Uint8Array(lutSize * lutSize * 4);
for (let y = 0; y < lutSize; y++) for (let x = 0; x < lutSize; x++) {
  const value = preintegratedDiffusion(x / (lutSize - 1) * 2 - 1, y / (lutSize - 1) * SKIN_DIFFUSION_MAX_CURVATURE_PER_MM);
  lut.set([...value.map(channel => Math.round(channel * 255)), 255], (y * lutSize + x) * 4);
}
const files = { 'thickness.png': png(size, pixels), 'thickness-diffusion-lut.png': png(lutSize, lut) };
await mkdir(output, { recursive: true });
for (const [file, content] of Object.entries(files)) await writeFile(`${output}/${file}`, content);
measured.sort((a, b) => a - b);
const sources = [
  { title: 'Burley 2015 normalized diffusion profile and its radial CDF, independent formula implementation', url: 'https://raw.githubusercontent.com/mmp/pbrt-v3/master/src/materials/disney.cpp' },
  { title: 'Burley 2015 BSDF course notes: spatial diffusion assumptions and limitations', url: 'https://blog.selfshadow.com/publications/s2015-shading-course/burley/s2015_pbs_disney_bsdf_notes.pdf' },
  { title: 'Chen, Lambert and Penner 2014: preintegrated curvature and its limitations', url: 'https://history.siggraph.org/wp-content/uploads/2022/12/2014-Poster-77-Chen_PDSS_-Pre-Integrated-Deferred-Subsurface-Scattering.pdf' },
];
const notice = `# Canonical thickness and diffusion study\n\nGenerated by scripts/parametric-portrait/build-thickness.mjs. Canonical geometry SHA-256 ${basisSha256} derives from the already recorded CC0 HM08/Anny basis. No photographs or measured skin scans are used.\n\nthickness.png stores the neutral geometry's inward-normal exit chord, in millimetres. Starting epsilon is ${epsilonMetres} metres, only back-face exits are accepted, and values are capped at ${SKIN_THICKNESS_MAX_MM} mm. R/G encode unsigned 16-bit distance; B is a conservative hit-validity indicator. Load as linear data with flipY=false. This is whole-object geometry thickness, not dermal/epidermal layer thickness or a light-direction thickness measurement. Open boundaries, concavities and pose/identity changes limit its validity. Invalid hits do not enable thin-object scattering.\n\nthickness-diffusion-lut.png is a project local-curvature irradiance preintegration using Burley's normalized two-exponential radial profile. The initial RGB profile d values are ${JSON.stringify(SKIN_DIFFUSION_DISTANCE_MM)} mm (uncalibrated artistic defaults, not this person's measured coefficients). The curvature axis is 0..${SKIN_DIFFUSION_MAX_CURVATURE_PER_MM} per mm; the cosine axis is -1..1. A normalized radial kernel samples a spherical normal field; it does not sample actual nearby surface irradiance, diffusion across a shadow boundary, or the path-traced Disney BSSRDF. The thickness response uses a bounded profile-tail redistribution, not a thin-slab transport solution.\n\n${sources.map(source => source.title + ': ' + source.url).join('\n')}\n\nMathematical equations were independently implemented; no third-party shader/source code was copied. The resulting image data and shader integration are project-authored. Visual acceptance, calibrated tissue parameters and Android performance remain unverified.\n`;
await writeFile(`${output}/thickness-SOURCE.md`, notice);
const sourceBytes = Buffer.from(notice);
const map = (file, width) => ({ path: `assets/parametric/skin/${file}`, sha256: sha(files[file]), bytes: files[file].length, width, height: width, colorSpace: 'linear', flipY: false });
const manifest = {
  version: 1, model: 'burley-profile-local-preintegration-v1', basisSha256,
  maps: {
    thickness: { ...map('thickness.png', size), losslessRequired: true },
    diffusionLut: { ...map('thickness-diffusion-lut.png', lutSize), losslessRequired: true, generateMipmaps: false, minFilter: 'linear', purpose: 'lookup' },
  },
  diffusionDistanceMm: SKIN_DIFFUSION_DISTANCE_MM,
  maximumCurvaturePerMm: SKIN_DIFFUSION_MAX_CURVATURE_PER_MM,
  maximumThicknessMm: SKIN_THICKNESS_MAX_MM,
  encoding: { thickness: 'RG-u16-normalized-mm', confidence: 'B', thicknessMeaning: 'neutral-object-inward-normal-chord', physiologicalDermalThickness: false },
  bake: { vertices: points.count, validVertices: measured.length, epsilonMetres, maximumRayMetres: maxRayMetres, minUnclippedMm: measured[0], medianUnclippedMm: measured[Math.floor(measured.length / 2)], p95UnclippedMm: measured[Math.floor(measured.length * 0.95)], maxUnclippedMm: measured.at(-1), neutralOnly: true },
  sources,
  licenseFiles: [{ path: 'assets/parametric/skin/thickness-SOURCE.md', sha256: sha(sourceBytes), bytes: sourceBytes.length }],
  limitations: ['Local curvature irradiance proxy, not a full spatial BSSRDF.', 'No irradiance transport across shadow boundaries or area/environment subsurface integration.', 'Neutral whole-object chord thickness is not measured skin-layer thickness and is not refitted for identity/pose.', 'Profile-tail thin-object response is a bounded approximation, not a thin-slab volume solution.', 'Initial channel distances need reference-image calibration.'],
};
const manifestText = JSON.stringify(manifest, null, 2) + '\n';
await writeFile(`${output}/thickness-manifest.json`, manifestText);
await writeFile('src/config/parametricTissue.json', manifestText);
geometry.dispose();
console.log(JSON.stringify({ model: manifest.model, maps: manifest.maps, bake: manifest.bake }, null, 2));
