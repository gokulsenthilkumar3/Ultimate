import {beforeEach,afterEach,expect,it,vi} from 'vitest';

const mocks=vi.hoisted(()=>({geometry:vi.fn(),texture:vi.fn()}));
vi.mock('three/addons/loaders/GLTFLoader.js',()=>({GLTFLoader:class {loadAsync(url){return mocks.geometry(url);}}}));
vi.mock('three',async importOriginal=>({...await importOriginal(),TextureLoader:class {loadAsync(url){return mocks.texture(url);}}}));
const manifest={garments:{tee:{geometry:'tee.glb',diffuse:'tee.png',normal:'tee-normal.png'},suit:{geometry:'suit.glb',diffuse:'suit.png'}}};

beforeEach(()=> {
  vi.resetModules();mocks.geometry.mockReset();mocks.texture.mockReset();
  mocks.geometry.mockImplementation(async url=>({scene:{children:[{name:url.includes('suit')?'suit':'tee'}]}}));
  mocks.texture.mockImplementation(async()=>({}));
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>manifest})));
});
afterEach(()=>vi.unstubAllGlobals());

it('preloads only the selected pattern and shares in-flight requests across outfits',async()=> {
  const {preloadWardrobeAsset}=await import('./useWardrobeAsset');
  const [underwear,gym]=await Promise.all([preloadWardrobeAsset('UNDERWEAR',{variant:'briefs'}),preloadWardrobeAsset('GYM',{variant:'training'})]);
  expect(underwear).toBe(gym);expect(fetch).toHaveBeenCalledTimes(1);expect(mocks.geometry).toHaveBeenCalledTimes(1);
  expect(mocks.geometry.mock.calls[0][0]).toMatch(/tee\.glb$/);
  expect(underwear.map.flipY).toBe(false);expect(underwear.map.colorSpace).toBe('srgb');
  await preloadWardrobeAsset('FORMAL',{variant:'suit'});
  expect(fetch).toHaveBeenCalledTimes(1);expect(mocks.geometry).toHaveBeenCalledTimes(2);
  expect(mocks.geometry.mock.calls[1][0]).toMatch(/suit\.glb$/);
});

it('retries a failed manifest instead of caching a rejected load',async()=> {
  fetch.mockResolvedValueOnce({ok:false});
  const {preloadWardrobeAsset}=await import('./useWardrobeAsset');
  await expect(preloadWardrobeAsset()).rejects.toThrow('manifest unavailable');
  await expect(preloadWardrobeAsset()).resolves.toHaveProperty('key','tee');
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('retries failed geometry while retaining successfully loaded surface maps',async()=> {
  mocks.geometry.mockRejectedValueOnce(new Error('Connection interrupted'));
  const {preloadWardrobeAsset}=await import('./useWardrobeAsset');
  await expect(preloadWardrobeAsset()).rejects.toThrow('Connection interrupted');
  await expect(preloadWardrobeAsset()).resolves.toHaveProperty('key','tee');
  expect(mocks.geometry).toHaveBeenCalledTimes(2);expect(mocks.texture).toHaveBeenCalledTimes(2);
});
