// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { createGarmentFitQueue } from './garmentFitQueue.js';

afterEach(() => vi.useRealTimers());
function setup() {
  vi.useFakeTimers();
  const worker = { postMessage: vi.fn(), terminate: vi.fn() }, onState = vi.fn();
  const queue = createGarmentFitQueue({ workerFactory: () => worker, onState });
  const job = () => ({ payload: Object.fromEntries(['bodyPositions', 'bodyIndices', 'garmentPositions', 'garmentIndices', 'outwardNormals'].map(key => [key, new Float32Array(3)])), apply: vi.fn() });
  const respond = (revision, result = { converged: true }) => worker.onmessage({ data: { revision, positions: new Float32Array([1, 2, 3]), result } });
  return { worker, queue, job, respond, onState };
}

it('coalesces edits, discards stale worker results and waits for the latest fit', async () => {
  const { worker, queue, job, respond } = setup();
  const first = job(), second = job(), third = job();
  queue.schedule(first); vi.advanceTimersByTime(80);
  queue.schedule(second); queue.schedule(third); vi.advanceTimersByTime(80);
  expect(worker.postMessage).toHaveBeenCalledTimes(1);
  const ready = queue.flush();
  respond(1);
  expect(first.apply).not.toHaveBeenCalled(); expect(second.apply).not.toHaveBeenCalled();
  expect(worker.postMessage).toHaveBeenCalledTimes(2);
  expect(worker.postMessage.mock.calls[1][0].revision).toBe(3);
  respond(1); expect(third.apply).not.toHaveBeenCalled();
  respond(3);
  await expect(ready).resolves.toMatchObject({ status: 'ready', revision: 3 });
  expect(third.apply).toHaveBeenCalledTimes(1); queue.dispose();
});

it('keeps failed geometry out of the viewer and rejects export', async () => {
  const { queue, job, respond } = setup();
  const current = job(); queue.schedule(current);
  const result = expect(queue.flush()).rejects.toThrow(/intersections/);
  respond(1, { converged: false }); await result;
  expect(current.apply).not.toHaveBeenCalled();
  await expect(queue.flush()).rejects.toThrow(/intersections/); queue.dispose();
});

it('rejects an export if the shape changes and cancels work on disposal', async () => {
  const { worker, queue, job, respond } = setup();
  const first = job(); queue.schedule(first);
  const cancelled = expect(queue.flush()).rejects.toThrow(/shape changed/);
  queue.schedule(job()); await cancelled;
  const closed = expect(queue.flush()).rejects.toThrow(/closed/);
  queue.dispose(); queue.dispose(); await closed;
  respond(1); expect(first.apply).not.toHaveBeenCalled();
  expect(worker.terminate).toHaveBeenCalledTimes(1);
});

it('reports worker failure without a main-thread synchronous fallback', async () => {
  const { worker, queue, job } = setup();
  const current = job(); queue.schedule(current);
  const result = expect(queue.flush()).rejects.toThrow('Worker stopped');
  worker.onerror({ message: 'Worker stopped' }); await result;
  expect(current.apply).not.toHaveBeenCalled();
  queue.schedule(job());
  await expect(queue.flush()).rejects.toThrow('Worker stopped');
  expect(worker.postMessage).toHaveBeenCalledTimes(1); queue.dispose();
});
