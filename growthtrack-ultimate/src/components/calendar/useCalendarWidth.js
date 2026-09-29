import { useLayoutEffect, useState } from 'react';

/** Use the content container, including rail/panel space, rather than device width. */
export default function useCalendarWidth(ref) {
  const [width, setWidth] = useState(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const measure = () => setWidth(element.getBoundingClientRect().width || element.clientWidth || window.innerWidth);
    measure();
    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(entries => setWidth(entries[0]?.contentRect.width || element.clientWidth || window.innerWidth));
      observer.observe(element); return () => observer.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [ref]);
  return width;
}
