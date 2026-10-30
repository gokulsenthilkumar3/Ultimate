import { useLayoutEffect } from 'react';
import usePlayfulMotion from './usePlayfulMotion';

/** Animate the existing region; never remount a page or clear its forms to animate it. */
export default function usePageEntrance(ref, routeKey) {
  const { canAnimate } = usePlayfulMotion();
  useLayoutEffect(() => {
    if (!canAnimate || !ref.current?.animate) return undefined;
    const animation = ref.current.animate([
      { opacity: 0.35, transform: 'translateY(10px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 360, easing: 'cubic-bezier(.22, 1, .36, 1)' });
    return () => animation.cancel();
  }, [canAnimate, ref, routeKey]);
}
