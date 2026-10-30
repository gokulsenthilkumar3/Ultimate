import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';

/** Variable-height table window. A focused row remains mounted until focus leaves it. */
export default function useVirtualTableRows<T>(rows: readonly T[], keyOf: (row: T) => string, scroll: RefObject<HTMLDivElement | null>, enabled = true) {
  const active = enabled && rows.length > 50;
  const heights = useRef(new Map<string, number>());
  const observer = useRef<ResizeObserver | null>(null);
  const [revision, setRevision] = useState(0);
  const [viewport, setViewport] = useState({ top: 0, height: 560, header: 0, focused: '' });
  const keys = useMemo(() => rows.map(keyOf), [rows, keyOf]);
  useEffect(() => { const present = new Set(keys); for (const key of heights.current.keys()) if (!present.has(key)) heights.current.delete(key); }, [keys]);
  useLayoutEffect(() => {
    if (!active || !scroll.current) return;
    const root = scroll.current;
    let frame = 0;
    const geometry = { height: root.clientHeight || 560, header: 0 };
    const update = () => {
      const focused = root.contains(document.activeElement) ? document.activeElement?.closest<HTMLTableRowElement>('tr[data-virtual-key]')?.dataset.virtualKey || '' : '';
      setViewport({ top: root.scrollTop, height: geometry.height, header: geometry.header, focused });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; update(); }); };
    // Layout is read on resize, never on the high-frequency scroll path.
    const measure = () => { const body = root.querySelector('tbody'); geometry.height = root.clientHeight || 560; geometry.header = body ? body.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop : 0; update(); };
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    resize?.observe(root); root.querySelectorAll('thead, caption').forEach(node => resize?.observe(node)); measure();
    root.addEventListener('scroll', schedule, { passive: true }); root.addEventListener('focusin', schedule); root.addEventListener('focusout', schedule);
    observer.current = typeof ResizeObserver === 'function' ? new ResizeObserver(entries => {
      let changed = false;
      for (const entry of entries) {
        const key = (entry.target as HTMLTableRowElement).dataset.virtualKey;
        const height = entry.borderBoxSize?.[0]?.blockSize || entry.contentRect.height;
        if (key && height > 0 && Math.abs((heights.current.get(key) || 56) - height) > .5) { heights.current.set(key, height); changed = true; }
      }
      if (changed) setRevision(value => value + 1);
    }) : null;
    return () => { cancelAnimationFrame(frame); resize?.disconnect(); observer.current?.disconnect(); observer.current = null; root.removeEventListener('scroll', schedule); root.removeEventListener('focusin', schedule); root.removeEventListener('focusout', schedule); };
  }, [active, scroll]);
  useLayoutEffect(() => {
    const current = observer.current;
    if (!current || !scroll.current) return;
    const nodes = [...scroll.current.querySelectorAll('tr[data-virtual-key]')];
    nodes.forEach(node => current.observe(node));
    return () => nodes.forEach(node => current.unobserve(node));
  });
  const offsets = useMemo(() => { const values = [0]; for (const key of keys) values.push(values.at(-1)! + (heights.current.get(key) || 56)); return values; }, [keys, revision]);
  const find = (offset: number) => { let left = 0, right = rows.length; while (left < right) { const middle = (left + right) >>> 1; if (offsets[middle + 1] <= offset) left = middle + 1; else right = middle; } return Math.min(rows.length - 1, left); };
  const top = Math.max(0, viewport.top - viewport.header);
  const start = active ? Math.max(0, find(top) - 3) : 0;
  const end = active ? Math.min(rows.length, find(top + viewport.height) + 4) : rows.length;
  const indices = Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i);
  const focused = keys.indexOf(viewport.focused);
  if (active && focused >= 0 && !indices.includes(focused)) indices.push(focused);
  indices.sort((a, b) => a - b);
  const segments: ({ kind: 'spacer'; height: number; key: string } | { kind: 'row'; row: T; index: number; key: string })[] = [];
  let previous = 0;
  for (const index of indices) {
    if (active && offsets[index] > previous) segments.push({ kind: 'spacer', height: offsets[index] - previous, key: `spacer-${index}` });
    segments.push({ kind: 'row', row: rows[index], index, key: keys[index] }); previous = offsets[index + 1];
  }
  if (active && offsets.at(-1)! > previous) segments.push({ kind: 'spacer', height: offsets.at(-1)! - previous, key: 'spacer-end' });
  return { active, segments };
}
