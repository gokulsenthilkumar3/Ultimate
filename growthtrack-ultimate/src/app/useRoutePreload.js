import { useCallback, useEffect, useRef } from 'react';
import { resolveFeatureRoute } from '../config/featureRegistry';

/** Only fetch a likely next page after clear intent. Critical route loading never uses this gate. */
export default function useRoutePreload({ ready, tier, preload }) {
  const warmed = useRef(new Set()), pending = useRef(null);
  const cancel = useCallback(() => { if (pending.current) clearTimeout(pending.current.timer); pending.current = null; }, []);
  useEffect(() => cancel, [ready, tier, cancel]);
  const target = event => {
    const connection = navigator.connection;
    if (!ready || tier === 0 || connection?.saveData || /^(slow-)?2g$/.test(connection?.effectiveType || '')) return null;
    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return null;
    const url = new URL(link.href, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    const pathname = url.pathname.startsWith(base + '/') ? url.pathname.slice(base.length) : url.pathname;
    return { link, feature: resolveFeatureRoute(pathname, url.search, url.hash).feature };
  };
  const warm = feature => {
    if (!feature || warmed.current.has(feature.id) || warmed.current.size >= 12) return;
    warmed.current.add(feature.id);
    void Promise.resolve().then(() => preload(feature.id)).catch(() => warmed.current.delete(feature.id));
  };
  return {
    onPointerOver: event => {
      if (event.pointerType === 'touch') return;
      const next = target(event);
      if (!next?.feature || (event.relatedTarget instanceof Node && next.link.contains(event.relatedTarget))) return;
      cancel();
      pending.current = { link: next.link, timer: setTimeout(() => { pending.current = null; warm(next.feature); }, 160) };
    },
    onPointerOut: event => { if (pending.current && !(event.relatedTarget instanceof Node && pending.current.link.contains(event.relatedTarget))) cancel(); },
    onFocusCapture: event => { cancel(); warm(target(event)?.feature); },
  };
}
