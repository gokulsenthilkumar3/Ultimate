import { afterEach, expect, it, vi } from 'vitest';
import { BoxGeometry, Mesh, MeshStandardMaterial } from 'three';
import { createSceneRuntime } from './sceneRuntime';

const mocks = vi.hoisted(() => ({ render: vi.fn(), dispose: vi.fn(), lose: vi.fn(), ratio: vi.fn() }));
vi.mock('three', async importOriginal => ({ ...await importOriginal(), WebGLRenderer: class {
  domElement = document.createElement('canvas'); info = { render: { calls: 1, triangles: 12 } };
  setPixelRatio = mocks.ratio; setClearColor() {} setSize() {} render = mocks.render; dispose = mocks.dispose; forceContextLoss = mocks.lose;
} }));
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.clearAllMocks(); document.body.innerHTML = ''; });
it('stops scheduling while hidden and disposes geometry, materials and its context exactly once', () => {
  const frames = new Map(); let next = 0;
  vi.stubGlobal('requestAnimationFrame', callback => { frames.set(++next, callback); return next; });
  vi.stubGlobal('cancelAnimationFrame', id => frames.delete(id));
  const disconnect = vi.fn(); vi.stubGlobal('ResizeObserver', class { observe() {} disconnect = disconnect; });
  const host = document.createElement('span'); document.body.append(host);
  vi.spyOn(host, 'getBoundingClientRect').mockReturnValue({ width: 200, height: 200 });
  const geometry = new BoxGeometry(), material = new MeshStandardMaterial();
  const geometryDisposed = vi.fn(), materialDisposed = vi.fn(); geometry.addEventListener('dispose', geometryDisposed); material.addEventListener('dispose', materialDisposed);
  const runtime = createSceneRuntime(host, { compact: true, build(root) { root.add(new Mesh(geometry, material)); return { update() {} }; } });
  expect(host.querySelector('canvas')).not.toBeNull();
  expect(mocks.ratio.mock.calls[0][0]).toBeLessThanOrEqual(1.25);
  runtime.setActive(true); expect(frames.size).toBe(1);
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  document.dispatchEvent(new Event('visibilitychange')); expect(frames.size).toBe(0); expect(host.dataset.running).toBe('false');
  hidden.mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange')); expect(frames.size).toBe(1);
  runtime.dispose(); runtime.dispose();
  expect(frames.size).toBe(0); expect(host.querySelector('canvas')).toBeNull();
  expect(geometryDisposed).toHaveBeenCalledTimes(1); expect(materialDisposed).toHaveBeenCalledTimes(1);
  expect(mocks.dispose).toHaveBeenCalledTimes(1); expect(mocks.lose).toHaveBeenCalledTimes(1); expect(disconnect).toHaveBeenCalledTimes(1);
});
