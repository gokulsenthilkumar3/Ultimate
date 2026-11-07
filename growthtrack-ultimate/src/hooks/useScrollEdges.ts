import { useLayoutEffect, type RefObject } from 'react';

export type ScrollEdges = { overflow: boolean; left: boolean; right: boolean; rtl: boolean };
type Options = { onChange?: (edges: ScrollEdges) => void; wheel?: boolean; revealSelection?: boolean };

/** Cues reveal overflow without replacing native wheel, touch or keyboard scrolling. */
export function mountScrollEdges(scroller: HTMLElement, frame: HTMLElement, options: Options = {}) {
  let pending = 0, disposed = false;
  let previous = '', selected: Element | null = null;
  const reveal = (target: Element | null) => {
    if (!target || scroller.scrollWidth <= scroller.clientWidth + 2) return;
    const viewport = scroller.getBoundingClientRect(), item = target.getBoundingClientRect();
    const distance = item.left < viewport.left + 8 ? item.left - viewport.left - 8 : item.right > viewport.right - 8 ? item.right - viewport.right + 8 : 0;
    if (distance) scroller.scrollLeft += distance;
  };
  const measure = () => {
    pending = 0;
    if (disposed) return;
    if (options.revealSelection) {
      const next = scroller.querySelector('[aria-selected="true"], [aria-current="page"], [aria-pressed="true"]');
      if (next !== selected) { selected = next; reveal(next); }
    }
    const maximum = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const rtl = getComputedStyle(scroller).direction === 'rtl';
    const offset = Math.max(0, Math.min(maximum, rtl ? -scroller.scrollLeft : scroller.scrollLeft));
    const before = maximum > 2 && offset > 2, after = maximum > 2 && offset < maximum - 2;
    const edges = { overflow: scroller.scrollWidth > frame.clientWidth + 2, left: rtl ? after : before, right: rtl ? before : after, rtl };
    const key = `${edges.overflow}:${edges.left}:${edges.right}:${rtl}`;
    if (key !== previous) {
      previous = key; frame.dataset.scrollLeft = String(edges.left); frame.dataset.scrollRight = String(edges.right); options.onChange?.(edges);
    }
  };
  const schedule = () => { if (!disposed && !pending) pending = requestAnimationFrame(measure); };
  const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { selected = null; schedule(); }) : null;
  const observe = () => {
    resize?.disconnect(); resize?.observe(scroller);
    // The animated selection indicator changes size every frame but never changes row overflow.
    [...scroller.children].filter(child => child.getAttribute('aria-hidden') !== 'true').forEach(child => resize?.observe(child));
    schedule();
  };
  const mutations = new MutationObserver(records => {
    if (records.some(record => record.attributeName === 'dir')) selected = null;
    if (records.some(record => record.type === 'attributes' || [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1))) observe();
  });
  mutations.observe(scroller, { childList: true, subtree: true, ...(options.revealSelection ? { attributes: true, attributeFilter: ['aria-selected', 'aria-current', 'aria-pressed', 'dir'] } : {}) });
  // Profile direction is inherited from the shell/html and can flip without any resize or scroll.
  for (let ancestor = scroller.parentElement; ancestor; ancestor = ancestor.parentElement) {
    mutations.observe(ancestor, { attributes: true, attributeFilter: ['dir'] });
  }
  const focus = (event: FocusEvent) => { if (event.target instanceof Element) { reveal(event.target.closest('button, a, [role="tab"]')); schedule(); } };
  const wheel = (event: WheelEvent) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || Math.abs(event.deltaX) > 1 || !event.deltaY) return;
    const maximum = scroller.scrollWidth - scroller.clientWidth;
    if (maximum <= 2) return;
    const rtl = getComputedStyle(scroller).direction === 'rtl';
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? scroller.clientWidth : 1) * (rtl ? -1 : 1);
    // Browser scroll extents can be fractional while scrollWidth/clientWidth are rounded.
    // Use the same edge tolerance as the controls, so a final subpixel never traps page scrolling.
    if ((delta > 0 && (rtl ? 0 : maximum) - scroller.scrollLeft <= 2) || (delta < 0 && scroller.scrollLeft - (rtl ? -maximum : 0) <= 2)) {
      // Chrome can retain a horizontal wheel target even when its vertical
      // extent is hidden. Forward an ordinary vertical wheel to the nearest
      // ancestor that can move, so long pages never get trapped at a rail end.
      for (let ancestor = scroller.parentElement; ancestor; ancestor = ancestor.parentElement) {
        if (ancestor !== document.scrollingElement && !/^(auto|scroll)$/.test(getComputedStyle(ancestor).overflowY)) continue;
        const maximumY = ancestor.scrollHeight - ancestor.clientHeight;
        const step = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? ancestor.clientHeight : 1);
        const nextY = Math.max(0, Math.min(maximumY, ancestor.scrollTop + step));
        if (maximumY > 0 && Math.abs(nextY - ancestor.scrollTop) >= 1) {
          event.preventDefault(); ancestor.scrollTop = nextY; return;
        }
      }
      return;
    }
    const next = Math.max(rtl ? -maximum : 0, Math.min(rtl ? 0 : maximum, scroller.scrollLeft + delta));
    if (Math.abs(next - scroller.scrollLeft) < 1) return;
    event.preventDefault(); scroller.scrollLeft = next; schedule();
  };
  scroller.addEventListener('scroll', schedule, { passive: true });
  if (options.wheel) scroller.addEventListener('wheel', wheel, { passive: false });
  if (options.revealSelection) scroller.addEventListener('focusin', focus);
  window.addEventListener('resize', schedule);
  observe();
  return () => {
    disposed = true; cancelAnimationFrame(pending); resize?.disconnect(); mutations.disconnect();
    scroller.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule);
    scroller.removeEventListener('wheel', wheel); scroller.removeEventListener('focusin', focus);
    delete frame.dataset.scrollLeft; delete frame.dataset.scrollRight;
  };
}

export default function useScrollEdges(ref: RefObject<HTMLElement | null>, frameRef: RefObject<HTMLElement | null>, availability: unknown = true) {
  useLayoutEffect(() => {
    if (ref.current && frameRef.current) return mountScrollEdges(ref.current, frameRef.current);
  }, [ref, frameRef, availability]);
}
