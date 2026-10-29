import { lazy } from 'react';

// Share one import between route preloading and React. A failed speculative
// request can be retried when the page actually renders.
export default function lazyPage(load) {
  let pending;
  const preload = () => {
    if (!pending) pending = Promise.resolve().then(load).catch(error => {
      pending = undefined;
      throw error;
    });
    return pending;
  };
  return Object.assign(lazy(preload), { preload });
}
