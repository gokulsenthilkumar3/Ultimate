import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PARAMETRIC_HUMAN } from '../../lib/parametricHuman';
import { avatarSha256 } from './avatarPackage';
import { loadParametricSkinAssets, loadParametricSkinNotices } from './parametricVisualAssets';
import { loadParametricAttachmentAssets } from './parametricAttachments';
import { loadParametricEyeAssets } from './parametricEyes';

let candidatePromise;
const assetUrl = path => `${import.meta.env.BASE_URL}${path}`;

/** Only a pinned, same-origin, hash-verified basis enters the live renderer. */
export function loadParametricCandidate() {
  if (!candidatePromise) candidatePromise = (async () => {
    const startedAt = performance.now();
    // The independent, pinned visual assets need not wait for the 6.8 MB basis.
    // Keep verification before parsing and keep all failures in one observed promise.
    const [{ basis, gltf }, skin, attachments, eyes] = await Promise.all([
      (async () => {
        const response = await fetch(assetUrl(PARAMETRIC_HUMAN.path));
        if (!response.ok) throw new Error(`The parametric body could not be loaded (${response.status}).`);
        const basis = await response.arrayBuffer();
        if (basis.byteLength !== PARAMETRIC_HUMAN.bytes || await avatarSha256(basis) !== PARAMETRIC_HUMAN.asset.sourceHash) throw new Error('The parametric body does not match its recorded source version.');
        return { basis, gltf: await new GLTFLoader().parseAsync(basis, '') };
      })(), loadParametricSkinAssets(), loadParametricAttachmentAssets(), loadParametricEyeAssets(),
    ]);
    return { scene: gltf.scene, basis, skin, attachments, eyes, loadMetrics: { assetsAndParseMs: performance.now() - startedAt, basisBytes: basis.byteLength, strategy: 'parallel-verified-assets' } };
  })().catch(error => { candidatePromise = null; throw error; });
  return candidatePromise;
}

export async function loadParametricLicenseFiles() {
  const entries = await Promise.all(PARAMETRIC_HUMAN.licenseFiles.map(async file => {
    const response = await fetch(assetUrl(file.path));
    if (!response.ok) throw new Error('The avatar source notices could not be loaded. Retry the export.');
    const bytes = await response.arrayBuffer();
    if (await avatarSha256(bytes) !== file.sha256) throw new Error('An avatar source notice has changed; export was stopped.');
    return [file.path.split('/').pop(), new TextDecoder().decode(bytes)];
  }));
  const [skinNotices, attachments, eyes] = await Promise.all([loadParametricSkinNotices(), loadParametricAttachmentAssets(), loadParametricEyeAssets()]);
  return { ...Object.fromEntries(entries), ...skinNotices, ...attachments.licenseFiles, ...eyes.licenseFiles };
}
