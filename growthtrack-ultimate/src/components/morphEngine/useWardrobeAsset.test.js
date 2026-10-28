import {renderHook,waitFor,cleanup} from '@testing-library/react';
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
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

it('preloads only the selected pattern and shares in-flight requests across outfits',async()=> {
  const {preloadWardrobeAsset}=await import('./useWardrobeAsset');
  const [underwear,gym]=await Promise.all([preloadWardrobeAsset('UNDERWEAR',{variant:'briefs'}),preloadWardrobeAsset('GYM',{variant:'training'})]);
  expect(underwear).toBe(gym);expect(fetch).toHaveBeenCalledTimes(1);expect(mocks.geometry).toHaveBeenCalledTimes(1);
  expect(mocks.geometry.mock.calls[0][0]).toMatch(/tee\.glb$/);
  expect(mocks.texture).not.toHaveBeenCalled();
  const source=await preloadWardrobeAsset('GYM',{variant:'training',pattern:'source'});
  expect(source.map.flipY).toBe(false);expect(source.map.colorSpace).toBe('srgb');
  expect(mocks.geometry).toHaveBeenCalledTimes(1);
  expect(mocks.texture).toHaveBeenCalledTimes(1);
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

it('retries failed geometry without requesting unused surface maps',async()=> {
  mocks.geometry.mockRejectedValueOnce(new Error('Connection interrupted'));
  const {preloadWardrobeAsset}=await import('./useWardrobeAsset');
  await expect(preloadWardrobeAsset()).rejects.toThrow('Connection interrupted');
  await expect(preloadWardrobeAsset()).resolves.toHaveProperty('key','tee');
  expect(mocks.geometry).toHaveBeenCalledTimes(2);expect(mocks.texture).not.toHaveBeenCalled();
});


it('publishes usable geometry while an optional texture is still pending',async()=>{
  let finish;
  mocks.texture.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  const {useWardrobeAsset,useWardrobeLoadStatus}=await import('./useWardrobeAsset');
  const {result}=renderHook(()=>({asset:useWardrobeAsset('GYM',{variant:'training',pattern:'source'}),status:useWardrobeLoadStatus('GYM',{variant:'training',pattern:'source'}).status}));
  await waitFor(()=>expect(result.current.asset?.mesh).toBeTruthy());
  expect(result.current.status).toBe('detailing');
  expect(result.current.asset.map).toBeNull();
  finish({});
  await waitFor(()=>expect(result.current.status).toBe('ready'));
});

it('retains clothing after a texture failure and retries only the failed resource',async()=>{
  mocks.texture.mockRejectedValueOnce(new Error('Texture offline'));
  const {preloadWardrobeAsset,retryWardrobeAsset}=await import('./useWardrobeAsset');
  const basic=await preloadWardrobeAsset('GYM',{pattern:'source'});
  expect(basic.mesh).toBeTruthy();expect(basic.map).toBeNull();
  const detailed=await retryWardrobeAsset('GYM',{pattern:'source'});
  expect(detailed.map).toBeTruthy();expect(mocks.geometry).toHaveBeenCalledTimes(1);expect(mocks.texture).toHaveBeenCalledTimes(2);
});

it('never returns the previous outfit after switching assets',async()=>{
  const {useWardrobeAsset}=await import('./useWardrobeAsset');
  const {result,rerender}=renderHook(({preset,variant})=>useWardrobeAsset(preset,{variant}),{initialProps:{preset:'GYM',variant:'training'}});
  await waitFor(()=>expect(result.current?.key).toBe('tee'));
  rerender({preset:'FORMAL',variant:'suit'});
  expect(result.current).toBeNull();
  await waitFor(()=>expect(result.current?.key).toBe('suit'));
});
