import React, { useLayoutEffect, useRef, useState } from 'react';
import { mountScrollEdges } from '../../hooks/useScrollEdges';
import { useKinetic } from '../motion/KineticContext';

/** A native scroll row with explicit controls. Owners keep their tabs, links and keyboard behavior. */
export default function OverflowRail({ as: Element = 'div', label, children, className = '', frameClassName = '', scrollRef = undefined, horizontal: preferredHorizontal = true, horizontalAt = undefined, onDirectionChange = undefined, ...props }) {
  const internalRef = useRef(null), frame = useRef(null), ref = scrollRef || internalRef;
  const [edges, setEdges] = useState({ overflow: false, left: false, right: false, rtl: false });
  const [matches, setMatches] = useState(() => Boolean(horizontalAt && window.matchMedia?.(horizontalAt).matches));
  const horizontal = horizontalAt ? matches : preferredHorizontal;
  const { canAnimate, tier } = useKinetic();
  useLayoutEffect(() => { if (horizontal) onDirectionChange?.(edges.rtl); }, [horizontal, edges.rtl, onDirectionChange]);
  useLayoutEffect(() => {
    if (!horizontalAt || !window.matchMedia) return;
    const media = window.matchMedia(horizontalAt), update = () => setMatches(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [horizontalAt]);
  useLayoutEffect(() => {
    if (!horizontal || !ref.current || !frame.current) return;
    return mountScrollEdges(ref.current, frame.current, { onChange: setEdges, wheel: true, revealSelection: true });
  }, [ref, horizontal]);
  const move = direction => ref.current?.scrollBy({ left: direction * Math.max(160, ref.current.clientWidth * .75), behavior: canAnimate && tier > 0 ? 'smooth' : 'instant' });
  return <div ref={frame} className={`gt-overflow-rail ${frameClassName}`.trim()} data-overflow={horizontal && edges.overflow} data-horizontal={horizontal}>
    <button type="button" className="gt-overflow-rail__control" hidden={!horizontal || !edges.overflow} disabled={!(edges.rtl ? edges.right : edges.left)} aria-label={`Scroll ${label} ${edges.rtl ? 'right' : 'left'}`} onClick={() => move(edges.rtl ? 1 : -1)} title="Previous tabs"><span aria-hidden="true">{edges.rtl ? '›' : '‹'}</span></button>
    {React.createElement(Element, { ...props, ref, className: `gt-overflow-rail__items ${className}`.trim(), 'data-overflow-items': horizontal ? '' : undefined }, children)}
    <button type="button" className="gt-overflow-rail__control" hidden={!horizontal || !edges.overflow} disabled={!(edges.rtl ? edges.left : edges.right)} aria-label={`Scroll ${label} ${edges.rtl ? 'left' : 'right'}`} onClick={() => move(edges.rtl ? -1 : 1)} title="More tabs"><span aria-hidden="true">{edges.rtl ? '‹' : '›'}</span></button>
  </div>;
}
