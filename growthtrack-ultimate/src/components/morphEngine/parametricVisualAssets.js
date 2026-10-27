import { ClampToEdgeWrapping, LinearFilter, NoColorSpace, RepeatWrapping, SRGBColorSpace, TextureLoader } from 'three';
import skinManifest from '../../config/parametricSkin.json';
import tissueManifest from '../../config/parametricTissue.json';
import { avatarSha256 } from './avatarPackage';

export const PARAMETRIC_SKIN = Object.freeze(skinManifest);
let skinPromise;
const assetUrl = path => `${import.meta.env.BASE_URL}${path}`;

async function verifiedBytes(file) {
  const response = await fetch(assetUrl(file.path));
  if (!response.ok) throw new Error(`The skin asset could not be loaded (${response.status}).`);
  const data = await response.arrayBuffer();
  if ((file.bytes !== undefined && data.byteLength !== file.bytes) || await avatarSha256(data) !== file.sha256) {
    throw new Error('A skin asset does not match its recorded version.');
  }
  return data;
}

/** Shared, hash-verified maps. Per-person materials never own these textures. */
export function loadParametricSkinAssets() {
  if (!skinPromise) skinPromise = (async () => {
    const entries = Object.entries({ ...skinManifest.maps, ...tissueManifest.maps });
    const loaded = await Promise.allSettled(entries.map(async ([name, file]) => {
      const data = await verifiedBytes(file);
      const url = URL.createObjectURL(new Blob([data], { type: 'image/png' }));
      let texture;
      try {
        texture = await new TextureLoader().loadAsync(url);
        if (texture.image.width !== file.width || texture.image.height !== file.height) throw new Error('A skin map has unexpected dimensions.');
        texture.name = `parametric-skin-${name}`;
        texture.flipY = false;
        texture.colorSpace = name === 'albedo' ? SRGBColorSpace : NoColorSpace;
        texture.wrapS = texture.wrapT = file.wrap === 'repeat' ? RepeatWrapping : ClampToEdgeWrapping;
        if (file.repeat) texture.repeat.set(...file.repeat);
        if (file.generateMipmaps === false) texture.generateMipmaps = false;
        if (file.minFilter === 'linear') texture.minFilter = LinearFilter;
        texture.anisotropy = 4;
        texture.needsUpdate = true;
        return [name, texture];
      } catch (error) { texture?.dispose(); throw error; }
      finally { URL.revokeObjectURL(url); }
    }));
    const error = loaded.find(result => result.status === 'rejected');
    if (error) {
      for (const result of loaded) if (result.status === 'fulfilled') result.value[1].dispose();
      throw error.reason;
    }
    return { textures: Object.fromEntries(loaded.map(result => result.value)), manifest: skinManifest, tissueManifest };
  })().catch(error => { skinPromise = null; throw error; });
  return skinPromise;
}

export async function loadParametricSkinNotices() {
  return Object.fromEntries(await Promise.all([...skinManifest.licenseFiles, ...tissueManifest.licenseFiles].map(async file => [
    file.path.split('/').pop(), new TextDecoder().decode(await verifiedBytes(file)),
  ])));
}
