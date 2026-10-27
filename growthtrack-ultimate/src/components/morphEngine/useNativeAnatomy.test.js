import {afterEach,describe,expect,it,vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {createHash,webcrypto} from 'node:crypto';
import {BufferGeometry,Group,Mesh,MeshBasicMaterial} from 'three';
import {loadNativeAnatomyPackage,useNativeAnatomy} from './useNativeAnatomy';

afterEach(()=>vi.unstubAllGlobals());
const bytes=new Uint8Array([1,2,3,4]).buffer;
const hash=createHash('sha256').update(new Uint8Array(bytes)).digest('hex');
const asset=path=>({privatePath:path,privateSha256:hash});
const parser=scene=>({setMeshoptDecoder:vi.fn(),parseAsync:vi.fn(async()=>({scene}))});
describe('native package request lifecycle',()=>{
  it('does not fetch before an eligible explicit reveal',()=>{
    const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
    const {result}=renderHook(()=>useNativeAnatomy({},asset('/covered.glb'),false));
    expect(result.current.status).toBe('idle');expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects corrupted bytes before parsing or attachment',async()=>{
    vi.stubGlobal('crypto',webcrypto);
    const loader=parser(new Group()),fetcher=vi.fn(async()=>({ok:true,arrayBuffer:async()=>bytes}));
    await expect(loadNativeAnatomyPackage({privatePath:'/bad-integrity.glb',privateSha256:'0'.repeat(64)},{fetcher,loader})).rejects.toThrow('integrity');
    expect(loader.parseAsync).not.toHaveBeenCalled();
  });
  it('does not parse a response that arrives after reveal was cancelled',async()=>{
    vi.stubGlobal('crypto',webcrypto);
    let release;const response=new Promise(resolve=>{release=resolve;});
    const controller=new AbortController(),loader=parser(new Group());
    const pending=loadNativeAnatomyPackage(asset('/cancel-fetch.glb'),{signal:controller.signal,loader,fetcher:async()=>({ok:true,arrayBuffer:()=>response})});
    controller.abort();release(bytes);
    await expect(pending).rejects.toMatchObject({name:'AbortError'});
    expect(loader.parseAsync).not.toHaveBeenCalled();
  });
  it('disposes a late parse and never publishes it after cancellation',async()=>{
    vi.stubGlobal('crypto',webcrypto);
    const scene=new Group(),mesh=new Mesh(new BufferGeometry(),new MeshBasicMaterial());scene.add(mesh);
    const dispose=vi.spyOn(mesh.geometry,'dispose'),controller=new AbortController();
    let parsed;const loader={setMeshoptDecoder:vi.fn(),parseAsync:vi.fn(()=>new Promise(resolve=>{parsed=resolve;}))};
    const pending=loadNativeAnatomyPackage(asset('/cancel-parse.glb'),{signal:controller.signal,loader,fetcher:async()=>({ok:true,arrayBuffer:async()=>bytes})});
    await vi.waitFor(()=>expect(loader.parseAsync).toHaveBeenCalled());
    controller.abort();parsed({scene});
    await expect(pending).rejects.toMatchObject({name:'AbortError'});
    expect(dispose).toHaveBeenCalledTimes(1);
  });
  it('leaves failed HTTP requests retryable',async()=>{
    const loader=parser(new Group());
    await expect(loadNativeAnatomyPackage(asset('/not-found.glb'),{loader,fetcher:async()=>({ok:false,status:503})})).rejects.toThrow('503');
    expect(loader.parseAsync).not.toHaveBeenCalled();
  });
});
