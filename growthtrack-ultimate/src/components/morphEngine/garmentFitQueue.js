/** One worker, one in-flight solve and only the newest queued shape. Obsolete
 * results never touch the live garment. Export waits for the current revision. */
export function createGarmentFitQueue({ onState = () => {}, workerFactory = () => new Worker(new URL('./garmentFit.worker.js', import.meta.url), { type: 'module' }), delayMs = 80 } = {}) {
  const worker = workerFactory();
  let revision = 0, active = null, queued = null, timer = null, disposed = false, workerError = null;
  let state = { status: 'idle', revision }, waiters = [];
  const publish = next => { state = { revision, ...next }; onState(state); };
  const settle = error => { const current = waiters; waiters = []; current.forEach(waiter => error ? waiter.reject(error) : waiter.resolve(state)); };
  const dispatch = () => {
    timer = null;
    if (disposed || active || !queued) return;
    active = queued; queued = null;
    publish({ status: 'fitting' });
    const { payload } = active;
    try {
      worker.postMessage({ revision: active.revision, payload }, [payload.bodyPositions.buffer, payload.bodyIndices.buffer,
        payload.garmentPositions.buffer, payload.garmentIndices.buffer, payload.outwardNormals.buffer]);
    } catch (error) { active = null; publish({ status: 'failed', error: error.message }); settle(error); }
  };
  worker.onmessage = ({ data }) => {
    if (disposed || !active || data.revision !== active.revision) return;
    const completed = active; active = null;
    if (data.revision === revision) {
      try {
        if (data.error) throw new Error(data.error);
        if (!data.result?.converged) throw new Error('The tee could not be fitted without intersections for this shape.');
        completed.apply(data.positions, data.result);
        publish({ status: 'ready', result: data.result }); settle();
      } catch (error) { publish({ status: 'failed', error: error.message, result: data.result }); settle(error); }
    }
    if (queued && !timer) dispatch();
  };
  worker.onerror = event => {
    if (disposed) return;
    event.preventDefault?.(); active = null; queued = null;
    workerError = new Error(event.message || 'The garment fitting worker stopped. Reopen the editor to retry.');
    worker.terminate();
    publish({ status: 'failed', error: workerError.message }); settle(workerError);
  };
  worker.onmessageerror = () => worker.onerror({ message: 'The garment fitting result could not be read. Reopen the editor to retry.' });
  return {
    schedule(job) {
      if (disposed) throw new Error('The garment fitting queue has been disposed.');
      if (workerError) { publish({ status: 'failed', error: workerError.message }); return; }
      settle(new Error('The avatar shape changed while waiting for garment fitting.'));
      revision++; queued = { ...job, revision };
      clearTimeout(timer); timer = setTimeout(dispatch, delayMs);
      publish({ status: 'pending' });
    },
    flush() {
      if (disposed) return Promise.reject(new Error('The garment fitting queue has been disposed.'));
      if (state.status === 'failed') return Promise.reject(new Error(state.error));
      if (state.status === 'ready' || state.status === 'idle') return Promise.resolve(state);
      clearTimeout(timer); timer = null;
      const promise = new Promise((resolve, reject) => waiters.push({ resolve, reject }));
      dispatch(); return promise;
    },
    get state() { return state; },
    dispose() {
      if (disposed) return;
      disposed = true; clearTimeout(timer); queued = null; active = null;
      worker.terminate(); settle(new Error('The avatar editor closed before garment fitting completed.'));
    },
  };
}
