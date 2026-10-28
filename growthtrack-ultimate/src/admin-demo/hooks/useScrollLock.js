import { useEffect } from 'react';

const locks = new WeakMap();

export default function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    const body = document.body;
    const state = locks.get(body) || { count: 0, previous: body.style.overflow };
    state.count += 1; locks.set(body, state); body.style.overflow = 'hidden';
    return () => {
      state.count -= 1;
      if (!state.count) { body.style.overflow = state.previous; locks.delete(body); }
    };
  }, [active]);
}
