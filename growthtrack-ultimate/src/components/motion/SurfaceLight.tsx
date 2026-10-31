import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useKinetic } from './KineticContext';

const SURFACES = '.gt-card--interactive, .stat-card, .stat-tile, .kinetic-hero-metric, .editorial-overview__facts > div, .editorial-overview__links a, .native-card, .native-metric, .app-hub-card, .gt-settings-modal__links button, .playful-crew-card';

/** One shared light follows attention. It never transforms a card, its text, a form, or a chart. */
export default function SurfaceLight() {
  const { enabled, canAnimate, tier, budget, activeDialog } = useKinetic();
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();
  useEffect(() => {
    const light = ref.current;
    if (!enabled || !canAnimate || tier < 2 || !budget || !light) return;
    const forcedColors = window.matchMedia?.('(forced-colors: active)');
    const finePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)');
    let target: HTMLElement | null = null, bounds: DOMRect | null = null, frame = 0, x = 0, y = 0;
    const clear = () => {
      target = null; bounds = null; cancelAnimationFrame(frame); frame = 0;
      light.dataset.active = 'false'; budget.release(id);
    };
    const find = (node: EventTarget | null) => {
      const candidate = node instanceof Element ? node.closest<HTMLElement>(SURFACES) : null;
      return candidate && (!activeDialog || activeDialog.contains(candidate)) && !candidate.closest('[inert], [aria-hidden="true"]') ? candidate : null;
    };
    const position = () => {
      frame = 0;
      if (!target?.isConnected || !bounds || !budget.has(id)) { clear(); return; }
      light.style.setProperty('--light-x', `${Math.round(x - bounds.left)}px`);
      light.style.setProperty('--light-y', `${Math.round(y - bounds.top)}px`);
    };
    const show = (next: HTMLElement | null) => {
      if (next === target) return Boolean(target);
      clear();
      if (!next) return false;
      const rect = next.getBoundingClientRect();
      if (!rect.width || !rect.height || rect.width > 1300 || rect.height > 900) return false;
      budget.request(id, 1, 7);
      if (!budget.has(id)) { budget.release(id); return false; }
      target = next; bounds = rect;
      light.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
      light.style.width = `${rect.width}px`; light.style.height = `${rect.height}px`;
      light.style.borderRadius = getComputedStyle(next).borderRadius;
      // A portal must respect the card's scroll containers, including partially clipped tiles.
      const visible = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
      for (let parent = next.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        const clipX = /auto|scroll|hidden|clip/.test(style.overflowX || style.overflow);
        const clipY = /auto|scroll|hidden|clip/.test(style.overflowY || style.overflow);
        if (!clipX && !clipY) continue;
        const boundary = parent.getBoundingClientRect();
        if (clipX) { visible.left = Math.max(visible.left, boundary.left); visible.right = Math.min(visible.right, boundary.right); }
        if (clipY) { visible.top = Math.max(visible.top, boundary.top); visible.bottom = Math.min(visible.bottom, boundary.bottom); }
      }
      light.style.clipPath = `inset(${Math.max(0, visible.top - rect.top)}px ${Math.max(0, rect.right - visible.right)}px ${Math.max(0, rect.bottom - visible.bottom)}px ${Math.max(0, visible.left - rect.left)}px)`;
      light.dataset.active = 'true';
      return true;
    };
    const pointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || forcedColors?.matches || !finePointer?.matches) return;
      if (!show(find(event.target))) return;
      x = event.clientX; y = event.clientY;
      if (!frame) frame = requestAnimationFrame(position);
    };
    const out = (event: PointerEvent) => { if (target && !(event.relatedTarget instanceof Node && target.contains(event.relatedTarget))) clear(); };
    const focus = (event: FocusEvent) => {
      if (forcedColors?.matches) { clear(); return; }
      if (!show(find(event.target)) || !bounds) return;
      x = bounds.left + bounds.width / 2; y = bounds.top;
      position();
    };
    const focusOut = (event: FocusEvent) => { if (!find(event.relatedTarget)) clear(); };
    const mediaChange = () => { if (forcedColors?.matches || !finePointer?.matches) clear(); };
    forcedColors?.addEventListener?.('change', mediaChange); finePointer?.addEventListener?.('change', mediaChange);
    const unsubscribe = budget.subscribe(() => { if (target && !budget.has(id)) clear(); });
    document.addEventListener('pointerover', pointer);
    document.addEventListener('pointermove', pointer, { passive: true });
    document.addEventListener('pointerout', out);
    document.addEventListener('pointerdown', clear, true);
    document.addEventListener('focusin', focus);
    document.addEventListener('focusout', focusOut);
    document.addEventListener('scroll', clear, { passive: true, capture: true });
    window.addEventListener('resize', clear);
    return () => {
      unsubscribe(); clear();
      document.removeEventListener('pointerover', pointer); document.removeEventListener('pointermove', pointer);
      document.removeEventListener('pointerout', out); document.removeEventListener('pointerdown', clear, true);
      document.removeEventListener('focusin', focus); document.removeEventListener('focusout', focusOut);
      document.removeEventListener('scroll', clear, true); window.removeEventListener('resize', clear);
      forcedColors?.removeEventListener?.('change', mediaChange); finePointer?.removeEventListener?.('change', mediaChange);
    };
  }, [enabled, canAnimate, tier, budget, activeDialog, id]);
  return enabled && typeof document !== 'undefined' ? createPortal(<span ref={ref} className="kinetic-surface-light" data-active="false" aria-hidden="true" />, document.body) : null;
}
